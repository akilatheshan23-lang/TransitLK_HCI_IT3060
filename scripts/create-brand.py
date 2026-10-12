"""Render the project-owned TransitLK bus/location app mark."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[1] / 'mobile/assets'
out.mkdir(exist_ok=True)
def draw_mark(background, name):
    im=Image.new('RGBA',(1024,1024),background)
    d=ImageDraw.Draw(im)
    d.ellipse((250,150,774,674),fill='#FFFFFF')
    d.polygon([(294,560),(730,560),(512,836)],fill='#FFFFFF')
    d.rounded_rectangle((358,280,666,570),radius=52,fill='#008681')
    d.rounded_rectangle((382,308,642,438),radius=24,fill='#C8F5EB')
    d.line((512,308,512,438),fill='#008681',width=12)
    d.ellipse((391,481,429,519),fill='white');d.ellipse((595,481,633,519),fill='white')
    d.rounded_rectangle((388,550,427,594),radius=12,fill='#008681')
    d.rounded_rectangle((597,550,636,594),radius=12,fill='#008681')
    im.save(out/name)
draw_mark('#008681','icon.png')
draw_mark((0,0,0,0),'adaptive-icon.png')
Image.open(out/'icon.png').resize((64,64),Image.Resampling.LANCZOS).save(out/'favicon.png')
print(out)
