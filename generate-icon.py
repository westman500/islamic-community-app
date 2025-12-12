from PIL import Image, ImageDraw
import math

# Create 1024x1024 image with green background
size = 1024
img = Image.new('RGB', (size, size), color='#10b981')
draw = ImageDraw.Draw(img)

centerX = 512
centerY = 512
scale = 1.5

white = '#ffffff'
green = '#10b981'

# Helper function to draw filled arc (dome)
def draw_dome(draw, x, y, radius, color):
    # Draw semicircle as filled polygon
    points = []
    for angle in range(180, 361):
        rad = math.radians(angle)
        px = x + radius * math.cos(rad)
        py = y + radius * math.sin(rad)
        points.append((px, py))
    if points:
        draw.polygon(points, fill=color)

# Main dome
draw_dome(draw, centerX, centerY - 120 * scale, 80 * scale, white)

# Main building body
left = centerX - 140 * scale
top = centerY - 40 * scale
right = centerX + 140 * scale
bottom = centerY + 140 * scale
draw.rectangle([left, top, right, bottom], fill=white)

# Left minaret
left_min = centerX - 200 * scale
top_min = centerY - 100 * scale
right_min = centerX - 160 * scale
bottom_min = centerY + 140 * scale
draw.rectangle([left_min, top_min, right_min, bottom_min], fill=white)
# Left minaret dome
draw_dome(draw, centerX - 180 * scale, centerY - 100 * scale, 30 * scale, white)

# Right minaret
left_min_r = centerX + 160 * scale
right_min_r = centerX + 200 * scale
draw.rectangle([left_min_r, top_min, right_min_r, bottom_min], fill=white)
# Right minaret dome
draw_dome(draw, centerX + 180 * scale, centerY - 100 * scale, 30 * scale, white)

# Main entrance arch (green cutout)
draw_dome(draw, centerX, centerY + 60 * scale, 50 * scale, green)
# Door (green rectangle)
door_left = centerX - 50 * scale
door_top = centerY + 60 * scale
door_right = centerX + 50 * scale
door_bottom = centerY + 140 * scale
draw.rectangle([door_left, door_top, door_right, door_bottom], fill=green)

# Left window (green cutout)
draw_dome(draw, centerX - 80 * scale, centerY, 25 * scale, green)
win_left = centerX - 105 * scale
win_right = centerX - 55 * scale
win_top = centerY
win_bottom = centerY + 40 * scale
draw.rectangle([win_left, win_top, win_right, win_bottom], fill=green)

# Right window (green cutout)
draw_dome(draw, centerX + 80 * scale, centerY, 25 * scale, green)
win_left_r = centerX + 55 * scale
win_right_r = centerX + 105 * scale
draw.rectangle([win_left_r, win_top, win_right_r, win_bottom], fill=green)

# Crescents on domes (white circles with green overlay)
# Main dome crescent
crescent_main_x = centerX
crescent_main_y = centerY - 200 * scale
radius_crescent = 30 * scale
draw.ellipse([crescent_main_x - radius_crescent, crescent_main_y - radius_crescent,
              crescent_main_x + radius_crescent, crescent_main_y + radius_crescent], fill=white)
draw.ellipse([crescent_main_x - radius_crescent + 15 * scale, crescent_main_y - radius_crescent,
              crescent_main_x + radius_crescent + 15 * scale, crescent_main_y + radius_crescent], fill=green)

# Left minaret crescent
crescent_l_x = centerX - 180 * scale
crescent_l_y = centerY - 140 * scale
radius_small = 12 * scale
draw.ellipse([crescent_l_x - radius_small, crescent_l_y - radius_small,
              crescent_l_x + radius_small, crescent_l_y + radius_small], fill=white)
draw.ellipse([crescent_l_x - radius_small + 8 * scale, crescent_l_y - radius_small,
              crescent_l_x + radius_small + 8 * scale, crescent_l_y + radius_small], fill=green)

# Right minaret crescent
crescent_r_x = centerX + 180 * scale
draw.ellipse([crescent_r_x - radius_small, crescent_l_y - radius_small,
              crescent_r_x + radius_small, crescent_l_y + radius_small], fill=white)
draw.ellipse([crescent_r_x - radius_small + 8 * scale, crescent_l_y - radius_small,
              crescent_r_x + radius_small + 8 * scale, crescent_l_y + radius_small], fill=green)

# Save image
img.save('resources/icon.png')
print('✅ Icon generated: resources/icon.png')
print('📱 Run: npx @capacitor/assets generate --android')
