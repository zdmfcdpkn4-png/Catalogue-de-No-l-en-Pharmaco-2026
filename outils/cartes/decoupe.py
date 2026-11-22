# Découpe la fenêtre d'illustration (carré) de chaque carte générée et vide ses bulles :
# le texte d'origine est effacé, le contour dessiné est gardé ; la zone utile de chaque bulle est écrite
# dans illus/<id>.json (en % de la fenêtre) pour que le gabarit y pose le nouveau texte.
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
A = '/home/user/Catalogue-de-No-l-en-Pharmaco-2026/atelier/cartes/images/'
D = json.load(open(sys.argv[1]))
for c in D['cartes']:
    x, y, t = c['fenetre']
    a = np.array(Image.open(A + c['source'] + '.jpg').convert('RGB'))
    zones = []
    for x0, y0, x1, y1 in c.get('raccords', []):              # tache : on recoud la bande en mêlant ses deux bords
        g, d = a[y0:y1, x0 - 1].astype(float), a[y0:y1, x1].astype(float)
        for i in range(x0, x1):
            k = (i - x0 + 1) / (x1 - x0 + 1); a[y0:y1, i] = (g * (1 - k) + d * k).astype(np.uint8)
    for b in c.get('bulles', []):
        sx, sy = b['graine']                                   # un point blanc dans la bulle (image source)
        g = a.mean(2); clair = g > 175
        lab, n = nd.label(clair)
        R = lab == lab[sy, sx]                                  # intérieur blanc de la bulle, troué par le texte
        plein = nd.binary_fill_holes(R)
        trous = plein & ~R
        trous = nd.binary_dilation(trous, iterations=2) & nd.binary_erosion(plein, iterations=2)
        a[trous] = (255, 255, 255)
        # lettres qui touchaient le contour : on referme la bulle (disque de 10 px), on la rétrécit de 5 px, on blanchit le sombre
        disque = np.hypot(*np.mgrid[-10:11, -10:11]) <= 10
        ferme = nd.binary_closing(np.pad(plein, 12), structure=disque)[12:-12, 12:-12]
        coeur = nd.binary_erosion(ferme, iterations=4)
        a[coeur & (a.mean(2) < 200)] = (255, 255, 255)
        ys, xs = np.where(plein)
        zones.append([(xs.min() - x) / t * 100, (ys.min() - y) / t * 100, (xs.max() - xs.min()) / t * 100, (ys.max() - ys.min()) / t * 100])
    Image.fromarray(a).crop((x, y, x + t, y + t)).save('illus/%s.png' % c['id'])
    json.dump({'bulles': zones}, open('illus/%s.json' % c['id'], 'w'))
    print(c['id'], (x, y, t), [[round(v, 1) for v in z] for z in zones])
