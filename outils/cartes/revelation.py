# Carte « La Révélation » : retouche par code du modèle « L'énigme du jour » (même cadre, même parchemin).
import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as nd
SRC = '/home/user/Catalogue-de-No-l-en-Pharmaco-2026/atelier/enquete/affaire-du-lot-22/fond-enigme-du-jour.jpg'
CINZEL = 'node_modules/@fontsource/cinzel/files/cinzel-latin-800-normal.woff'
PARCH = (165, 425, 605, 1062)          # parchemin : jamais retouché
TITRE = (204, 182, 560, 390)           # titre d'origine

def hsv(a):
    r, g, b = [a[..., i] for i in range(3)]; mx = a.max(2); mn = a.min(2); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, np.where(mx > 0, d / (mx + 1e-6), 0), mx
def rgb(h, s, v):
    c = v * s; x = c * (1 - np.abs((h / 60) % 2 - 1)); m = v - c; z = np.zeros_like(h); k = (h // 60).astype(int) % 6
    R = np.choose(k, [c, x, z, z, x, c]); G = np.choose(k, [x, c, c, x, z, z]); B = np.choose(k, [z, z, x, c, c, x])
    return np.stack([R + m, G + m, B + m], -1)

def efface_titre(a):
    x0, y0, x1, y1 = TITRE; z = a[y0:y1, x0:x1].copy()
    h, s, v = hsv(z)
    fond = (h > 150) & (h < 215) & (s > 0.12) & (v > 0.30) & (v < 0.62)
    lettres = nd.binary_dilation(~fond, iterations=5)
    lettres[:3] = lettres[-3:] = False; lettres[:, :3] = lettres[:, -3:] = False
    # remplissage par diffusion (les bords connus se propagent vers l'intérieur)
    r = z.copy(); r[lettres] = np.median(z[~lettres], 0)
    for k in range(400):
        f = np.stack([nd.uniform_filter(r[..., i], 5) for i in range(3)], -1); r[lettres] = f[lettres]
    # texture : grain du fond d'origine (passe-haut des zones connues), recopié en mosaïque
    grain = z - np.stack([nd.uniform_filter(z[..., i], 7) for i in range(3)], -1)
    src = grain[~lettres]; rng = np.random.default_rng(2)
    r[lettres] += src[rng.integers(0, len(src), lettres.sum())] * 0.9
    a[y0:y1, x0:x1] = np.clip(r, 0, 1)

def teinte(a, fond_h=None, cadre_h=None):
    h, s, v = hsv(a); H, W = h.shape
    yy, xx = np.mgrid[0:H, 0:W]; px0, py0, px1, py1 = PARCH
    hors = ~((xx >= px0) & (xx < px1) & (yy >= py0) & (yy < py1))
    if fond_h is not None:
        m = hors & (h > 150) & (h < 215) & (s > 0.08)
        h = np.where(m, fond_h, h); s = np.where(m, np.clip(s * 1.25, 0, 1), s); v = np.where(m, v * 0.92, v)
    if cadre_h is not None:
        m = hors & (h > 25) & (h < 60) & (s > 0.25)
        h = np.where(m, h - (40 - cadre_h), h); s = np.where(m, np.clip(s * 1.12, 0, 1), s)
    return rgb(h, s, v)

def titre(im, l1, l2, haut=74, encre=(34, 26, 20)):
    W, H = im.size; S = 3
    def bloc(txt, taille, larg_max):
        f = ImageFont.truetype(CINZEL, taille * S)
        L = Image.new('L', (W * S, int(taille * 1.5) * S), 0); d = ImageDraw.Draw(L)
        d.text((W * S // 2, int(taille * .75) * S), txt, font=f, fill=255, anchor='mm')
        bb = L.getbbox(); L = L.crop(bb); w = L.width / S
        k = min(1, larg_max / w) ; L = L.resize((int(L.width * k * 0.86 if k < 1 else L.width * 0.86), L.height))   # léger serrage, comme l'original
        if L.width / S > larg_max: L = L.resize((int(larg_max * S), L.height))
        return L.resize((L.width // S, L.height // S), Image.LANCZOS)
    out = im.convert('RGBA')
    for txt, cy, taille, lm in [(l1, 250, 70, 300), (l2, 333, 84, 352)]:
        m = bloc(txt, taille, lm); w, h = m.size; x = (W - w) // 2; y = cy - h // 2
        pad = 12; M = Image.new('L', (w + 2 * pad, h + 2 * pad), 0); M.paste(m, (pad, pad))
        cont = M.filter(ImageFilter.MaxFilter(9))
        ombre = cont.filter(ImageFilter.GaussianBlur(4))
        g = np.zeros((h + 2 * pad, w + 2 * pad, 3)); t = np.linspace(0, 1, h + 2 * pad)[:, None]
        haut_c = np.array([246, 228, 178]); bas_c = np.array([176, 132, 70]); mil = np.array([226, 196, 130])
        col = np.where(t < .5, haut_c + (mil - haut_c) * (t / .5), mil + (bas_c - mil) * ((t - .5) / .5))
        g[:] = col[:, None, :] if col.ndim == 2 else col
        or_ = Image.fromarray(g.astype(np.uint8))
        # biseau : liseré clair en haut à gauche, sombre en bas à droite
        clair = Image.fromarray(np.clip(np.array(M, float) - np.roll(np.array(M, float), (2, 2), (0, 1)), 0, 255).astype(np.uint8))
        sombre = Image.fromarray(np.clip(np.array(M, float) - np.roll(np.array(M, float), (-2, -2), (0, 1)), 0, 255).astype(np.uint8))
        base = Image.new('RGBA', M.size, (0, 0, 0, 0))
        base.paste(Image.new('RGBA', M.size, (0, 0, 0, 150)), (3, 4), ombre)
        base.paste(Image.new('RGBA', M.size, encre + (255,)), (0, 0), cont)
        base.paste(or_.convert('RGBA'), (0, 0), M)
        base.paste(Image.new('RGBA', M.size, (255, 246, 214, 255)), (0, 0), clair.point(lambda p: int(p * .7)))
        base.paste(Image.new('RGBA', M.size, (110, 76, 30, 255)), (0, 0), sombre.point(lambda p: int(p * .6)))
        out.alpha_composite(base, (x - pad, y - pad))
    return out.convert('RGB')

def fabrique(nom, fond_h=None, cadre_h=None):
    a = np.array(Image.open(SRC).convert('RGB')).astype(float) / 255
    efface_titre(a)
    a = teinte(a, fond_h, cadre_h)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = titre(im, 'LA', 'RÉVÉLATION')
    im.save('sortie/revelation-%s.png' % nom); return im

if __name__ == '__main__':
    fabrique('teal')                       # contrôle : seulement le titre
    fabrique('bordeaux', fond_h=346)        # A : fond bordeaux, cadre doré
    fabrique('cuivre', fond_h=346, cadre_h=22)   # B : fond bordeaux, cadre cuivré
