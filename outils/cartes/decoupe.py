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
    s = 8; W, H = 58 * s, 30 * s
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    t = lambda c, al: tuple(int(v) for v in c) + (al,)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=4 * s, fill=t(fond, e.get('opacite', 228)), outline=t(bord, 230), width=int(1.5 * s))
    d.text((4 * s, 2.5 * s), 'LOT', font=ImageFont.truetype(POLICE, 7 * s), fill=t(encre, 235))
    f = ImageFont.truetype(POLICE, 15 * s)
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

def prepare(c):
    a = np.array(Image.open(A + c['source'] + '.jpg').convert('RGB'))
    for r in c.get('raccords', []): raccord(a, *r)
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
