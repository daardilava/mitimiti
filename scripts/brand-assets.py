# Renders the app icons, splash and favicon from the brand SVGs in assets/brand with headless Chrome.
#   python scripts/brand-assets.py   (needs Pillow and Google Chrome; overwrites the PNGs in assets/)
import os, re, shutil, subprocess, sys, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'brand')
OUT = os.path.join(ROOT, 'assets')
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
INK = '#1A2238'  # Tinta


def inner(name):
    s = open(os.path.join(SRC, name), encoding='utf-8').read()
    return re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)


MITI, MONO = inner('miti-neutral.svg'), inner('miti-mono-white.svg')


def g(content, d):
    """Miti (200-unit art, about 184 wide) scaled to diameter d, centred in a 1024 canvas."""
    k = d / 184
    t = 512 - 100 * k
    return f'<g transform="translate({t:.2f} {t:.2f}) scale({k:.4f})">{content}</g>'


JOBS = {
    # file: (pixel size, body in 1024 units)
    'icon.png': (1024, f'<rect width="1024" height="1024" fill="{INK}"/>' + g(MITI, 626)),  # iOS rounds the corners
    'store/play-icon-512.png': (512, f'<rect width="1024" height="1024" fill="{INK}"/>' + g(MITI, 626)),  # Play masks it
    # Launchers show about the middle 2/3 of an adaptive icon; 520 keeps Miti inside the safe zone.
    'android-icon-foreground.png': (1024, g(MITI, 520)),
    'android-icon-monochrome.png': (1024, g(MONO, 520)),
    'android-icon-background.png': (1024, f'<rect width="1024" height="1024" fill="{INK}"/>'),
    'splash-icon.png': (1024, g(MITI, 1000)),
    'favicon.png': (48, f'<rect width="1024" height="1024" rx="230" fill="{INK}"/>' + g(MITI, 700)),
}

tmp = tempfile.mkdtemp()
try:
    for name, (size, body) in JOBS.items():
        html = os.path.join(tmp, 'page.html')
        png = os.path.join(OUT, *name.split('/'))
        os.makedirs(os.path.dirname(png), exist_ok=True)
        open(html, 'w', encoding='utf-8').write(
            '<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}'
            'svg{display:block}</style></head><body>'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">{body}</svg>'
            '</body></html>')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--default-background-color=00000000', '--force-device-scale-factor=1',
                        f'--window-size={size},{size}', f'--screenshot={png}', 'file:///' + html.replace('\\', '/')],
                       capture_output=True, timeout=60, check=True)
        print(name, Image.open(png).size)
finally:
    shutil.rmtree(tmp)
sys.exit(0)
