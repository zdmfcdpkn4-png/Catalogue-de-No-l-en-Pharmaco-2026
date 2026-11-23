# Prépare l'illustration de chaque carte (image générée 768 x 1376) avant le gabarit :
# raccords (taches recousues), bulles vidées (texte effacé, contour gardé, zone utile mesurée),
# étiquette de lot fondue dans le décor (ton sur ton, en perspective), puis découpe de la fenêtre.
# Sorties : illus/<id>.png et illus/<id>.json (zones des bulles en % de la fenêtre).
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as nd

A = '/home/user/Catalogue-de-No-l-en-Pharmaco-2026/atelier/cartes/images/'
POLICE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def raccord(a, x0, y0, x1, y1):
    g, d = a[y0:y1, x0 - 1].astype(float), a[y0:y1, x1].astype(float)
    for i in range(x0, x1):
        k = (i - x0 + 1) / (x1 - x0 + 1); a[y0:y1, i] = (g * (1 - k) + d * k).astype(np.uint8)

def vide_bulle(a, boite):
    x0, y0, x1, y1 = boite
    clair = a.mean(2) > 175
    lab, n = nd.label(clair)
    z = lab[y0:y1, x0:x1]; ids, nb = np.unique(z[z > 0], return_counts=True)
    R = lab == ids[nb.argmax()]                       # plus grande plage blanche de la boîte = intérieur de la bulle
    cadre = np.zeros_like(R); cadre[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6] = True
    R &= cadre                                        # on reste dans la boîte (sinon la plage peut fuir dans le décor)
    plein = nd.binary_fill_holes(R)
    trous = nd.binary_dilation(plein & ~R, iterations=2) & nd.binary_erosion(plein, iterations=2)
    a[trous] = (255, 255, 255)
    disque = np.hypot(*np.mgrid[-10:11, -10:11]) <= 10
    ferme = nd.binary_closing(np.pad(plein, 12), structure=disque)[12:-12, 12:-12]
    coeur = nd.binary_erosion(ferme, iterations=4)
    a[coeur & (a.mean(2) < 200)] = (255, 255, 255)
    ys, xs = np.where(plein)
    return xs.min(), ys.min(), xs.max(), ys.max()

def coeffs(dst, src):
    # coefficients PIL PERSPECTIVE : point de sortie (dst) -> point source (src)
    M = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        M += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(M, float), np.array(B, float)).tolist()

def etiquette(a, e):
    q = [tuple(p) for p in e['quad']]                 # coins haut-gauche, haut-droit, bas-droit, bas-gauche (image source)
    xs = [p[0] for p in q]; ys = [p[1] for p in q]
    bx0, by0, bx1, by1 = int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3
    pix = a[by0:by1, bx0:bx1].reshape(-1, 3).astype(float)
    m = np.median(pix, 0)                             # teinte du support
    sens = e.get('sens', 'clair')                     # étiquette un peu plus claire (ou plus sombre) que le support
    fond = np.clip(m * (1.10 if sens == 'clair' else 0.88) + (10 if sens == 'clair' else 0), 0, 255)
    encre = np.clip(m * (0.52 if sens == 'clair' else 0.45), 0, 255)
    bord = np.clip(m * 0.80, 0, 255)
    s = 8; etroite = e.get('forme') == 'etroite'
    W, H = (38 * s, 48 * s) if etroite else (58 * s, 30 * s)
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    t = lambda c, al: tuple(int(v) for v in c) + (al,)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=4 * s, fill=t(fond, e.get('opacite', 228)), outline=t(bord, 230), width=int(1.5 * s))
    d.text((4 * s, 2.5 * s), 'LOT', font=ImageFont.truetype(POLICE, 7 * s), fill=t(encre, 235))
    f = ImageFont.truetype(POLICE, 15 * s)
    if etroite:   # numéro au-dessus, lettre en dessous : même corps que la forme large
        d.text((W // 2, 18 * s), e['num'], font=f, fill=t(encre, 240), anchor='mm')
        d.line([(6 * s, 28 * s), (W - 6 * s, 28 * s)], fill=t(bord, 200), width=s)
        d.text((W // 2, 38 * s), e['lettre'], font=f, fill=t(encre, 240), anchor='mm')
    else:
        d.text((4 * s, 11 * s), e['num'], font=f, fill=t(encre, 240))
        d.line([(int(34 * s), 5 * s), (int(34 * s), 25 * s)], fill=t(bord, 200), width=s)
        d.text((38 * s, 11 * s), e['lettre'], font=f, fill=t(encre, 240))
    # déformation en perspective sur le quadrilatère du support
    ow, oh = bx1 - bx0, by1 - by0
    dst = [(x - bx0, y - by0) for x, y in q]
    src = [(0, 0), (W, 0), (W, H), (0, H)]
    big = L.transform((ow * s, oh * s), Image.PERSPECTIVE, coeffs([(x * s, y * s) for x, y in dst], src), Image.BICUBIC)
    patch = big.resize((ow, oh), Image.LANCZOS).filter(ImageFilter.GaussianBlur(e.get('flou', 0.35)))
    im = Image.fromarray(a); im.paste(patch, (bx0, by0), patch); a[:] = np.array(im)

COND = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'node_modules/@fontsource/fira-sans-extra-condensed/files/fira-sans-extra-condensed-latin-700-normal.woff')
def remplace(a, r):
    # repeint une petite étiquette dessinée (boîte) et y écrit un nouveau texte, ligne par ligne
    x0, y0, x1, y1 = r['boite']; z = a[y0:y1, x0:x1].reshape(-1, 3).astype(float); lum = z.mean(1)
    sombre = r.get('sombre', False)
    fond = np.median(z[lum < np.percentile(lum, 50)] if sombre else z[lum > np.percentile(lum, 50)], 0)
    encre = r.get('encre') or ((235, 240, 230) if sombre else (40, 30, 25))
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    d.rectangle([x0, y0, x1, y1], fill=tuple(int(v) for v in fond))
    lignes = r['lignes']; n = len(lignes); hl = (y1 - y0) / n
    for i, l in enumerate(lignes):
        tl = int(hl * 0.8)
        while tl > 5 and ImageFont.truetype(COND, tl).getlength(l) > (x1 - x0) * 0.94: tl -= 1
        d.text(((x0 + x1) / 2, y0 + hl * (i + 0.5)), l, font=ImageFont.truetype(COND, tl), fill=tuple(encre), anchor='mm')
    a[:] = np.array(im.filter(ImageFilter.GaussianBlur(0))) ; 
    b = a[y0 - 1:y1 + 2, x0 - 1:x1 + 2]; a[y0 - 1:y1 + 2, x0 - 1:x1 + 2] = np.array(Image.fromarray(b).filter(ImageFilter.GaussianBlur(0.5)))

def floute(a, b, r=3.2):
    x0, y0, x1, y1 = b; z = Image.fromarray(a[y0:y1, x0:x1]).filter(ImageFilter.GaussianBlur(r)); a[y0:y1, x0:x1] = np.array(z)

def gribouille(a, b):
    # efface une écriture manuscrite (couleur du papier) et la remplace par un gribouillis illisible, penché comme le texte
    x0, y0, x1, y1, pente = b
    z = a[y0:y1, x0:x1].reshape(-1, 3).astype(float); lum = z.mean(1)
    papier = np.median(z[lum > np.percentile(lum, 60)], 0); encre = np.median(z[lum < np.percentile(lum, 8)], 0)
    sombre = (a[y0:y1, x0:x1].mean(2) < lum.mean() - 18)
    m = nd.binary_dilation(sombre, iterations=1)
    a[y0:y1, x0:x1][m] = papier.astype(np.uint8)
    im = Image.fromarray(a); d = ImageDraw.Draw(im); n = max(8, (x1 - x0) // 3)
    ym = (y0 + y1) / 2
    pts = [(x0 + 3 + i * (x1 - x0 - 6) / n, ym + pente * (i / n - .5) * (x1 - x0) + (2.4 if i % 2 else -2.4)) for i in range(n + 1)]
    d.line(pts, fill=tuple(int(v) for v in encre), width=1, joint='curve')
    a[:] = np.array(im)
    a[y0:y1, x0:x1] = np.array(Image.fromarray(a[y0:y1, x0:x1]).filter(ImageFilter.GaussianBlur(0.5)))

def irise(a, r):
    # reflets irisés sur un verre (couches minces) : arc-en-ciel en bandes obliques, fondu en « écran » sur le verre seul
    import colorsys
    H, W = a.shape[:2]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([tuple(p) for p in r['poly']], fill=255)
    m = np.array(m) > 0
    lum = a.mean(2)
    verre = m & (lum > r.get('min', 38)) & (lum < r.get('max', 165))     # ni le contour noir, ni l'étiquette claire
    verre = nd.binary_opening(verre, iterations=1)
    for x0, y0, x1, y1 in r.get('exclus', []): verre[y0:y1, x0:x1] = False
    # plus fort près des bords du verre, discret au centre (comme un vrai reflet de couche mince)
    dist = nd.distance_transform_edt(m); bord = np.clip(1.25 - dist / r.get('largeur', 22), 0.25, 1.0)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    t = (xx * 0.9 + yy * 0.45) / r.get('pas', 38) + 0.35 * np.sin(yy / 23.0)
    hue = np.mod(t, 1.0)
    rgb = np.zeros((H, W, 3))
    ys, xs = np.where(verre)
    for y, x in zip(ys, xs):
        rgb[y, x] = colorsys.hsv_to_rgb(hue[y, x], 0.65, 1.0)
    al = nd.gaussian_filter(verre.astype(float), 1.2) * r.get('force', 0.5) * bord
    base = a.astype(float) / 255
    ecran = 1 - (1 - base) * (1 - rgb)
    out = base * (1 - al[..., None]) + ecran * al[..., None]
    # reflet blanc vertical sur le bord gauche du verre
    for x0, y0, x1, y1 in r.get('reflets', []):
        z = np.zeros((H, W)); z[y0:y1, x0:x1] = 1; z = nd.gaussian_filter(z, 2.2) * 0.55 * verre
        out = out * (1 - z[..., None]) + z[..., None]
    a[:] = np.clip(out * 255, 0, 255).astype(np.uint8)

def attenue(a, b):
    x0, y0, x1, y1 = b; z = a[y0:y1, x0:x1].astype(float); lum = z.mean(2)
    med = np.median(z.reshape(-1, 3), 0); m = lum > np.percentile(lum, 55)
    z[m] = z[m] * 0.25 + med * 0.75
    a[y0:y1, x0:x1] = np.array(Image.fromarray(z.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))

def prepare(c):
    a = np.array(Image.open(A + c['source'] + '.jpg').convert('RGB'))
    for r in c.get('raccords', []): raccord(a, *r)
    for b in c.get('flous', []): floute(a, b)
    for b in c.get('gribouillis', []): gribouille(a, b)
    for b in c.get('attenues', []): attenue(a, b)
    for r in c.get('irises', []): irise(a, r)
    for r in c.get('remplacements', []): remplace(a, r)
    zones_abs = [vide_bulle(a, b['boite']) for b in c.get('bulles', [])]
    if c.get('etiquette'): etiquette(a, c['etiquette'])
    f = c['fenetre']; x, y, w = f[0], f[1], f[2]; h = f[3] if len(f) > 3 else w
    Image.fromarray(a).crop((x, y, x + w, y + h)).save('illus/%s.png' % c['id'])
    zones = [[(x0 - x) / w * 100, (y0 - y) / h * 100, (x1 - x0) / w * 100, (y1 - y0) / h * 100] for x0, y0, x1, y1 in zones_abs]
    json.dump({'bulles': zones, 'ratio': h / w}, open('illus/%s.json' % c['id'], 'w'))
    return zones

if __name__ == '__main__':
    D = json.load(open(sys.argv[1])); seule = sys.argv[2] if len(sys.argv) > 2 else None
    for c in D['cartes']:
        if seule and c['id'] != seule: continue
        print(c['id'], [[round(v, 1) for v in z] for z in prepare(c)])
