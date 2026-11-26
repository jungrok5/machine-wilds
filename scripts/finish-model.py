# machine-wilds · finish-model.py — a model made for a realm (Varco 3D's GLB) made ready for the page, in Blender (bpy):
#   python3 scripts/finish-model.py <in.glb> <out-dir> <id> --size <metres> [--axis y|x|z] [--tris 20000] [--tex 1024]
# One mesh (its parts joined), its transforms applied, scaled so its largest side along --axis is --size metres
# (y: its height; len: its longest side on the ground), stood on the ground at its middle, cut down to --tris triangles (Blender's collapse
# decimation keeps the UV seams), its maps cut to --tex px, written as glTF with separate files the engine reads
# (lib/47_models): <id>.gltf + .bin + <id>_diff_1k.jpg, <id>_nor_gl_1k.jpg, <id>_arm_1k.jpg (occlusion · roughness · metal:
# the name tells the engine the map is packed).  Needs `pip install bpy`.  Name the result in the realm's assets.json as
# { "id": <id>, "local": "models/<id>/<id>.gltf" } and run fetch-assets.mjs (it measures it).
import sys, os, argparse
import bpy, bmesh
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('id')
ap.add_argument('--size', type=float, required=True); ap.add_argument('--axis', default='y', help='y: height · x, z · len: the longest side on the ground')
ap.add_argument('--tris', type=int, default=20000); ap.add_argument('--tex', type=int, default=1024)
ap.add_argument('--yaw', type=float, default=0.0, help='turn about the vertical, degrees (so +x is its front)')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not meshes: sys.exit('no mesh in ' + a.src)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
# drop the empties the importer made, keep the transform in the mesh
if ob.parent: bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
  if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
# Blender is z-up: the glTF importer turned the file's y-up into z-up; measure and scale in Blender's axes
import math
if a.yaw: ob.rotation_euler[2] = math.radians(a.yaw); bpy.ops.object.transform_apply(rotation=True)
bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
ext = {'x': mx.x - mn.x, 'z': mx.y - mn.y, 'y': mx.z - mn.z}      # (glTF y = Blender z; glTF z = Blender -y)
ext['len'] = max(ext['x'], ext['z'])      # --axis len: its longest side on the ground
s = a.size / max(ext[a.axis], 1e-6)
ob.location = (-(mn.x + mx.x) / 2 * s, -(mn.y + mx.y) / 2 * s, -mn.z * s); ob.scale = (s, s, s)
bpy.ops.object.transform_apply(location=True, scale=True)
# fewer triangles
me = ob.data; bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); n0 = len(bm.faces); bm.to_mesh(me); bm.free()
if n0 > a.tris:
  m = ob.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = a.tris / n0; m.use_collapse_triangulate = True
  bpy.ops.object.modifier_apply(modifier=m.name)
for p in me.polygons: p.use_smooth = True
# its maps: smaller, named for the engine
os.makedirs(a.out, exist_ok=True)
kind = {}
for mat in me.materials:
  if not mat or not mat.use_nodes: continue
  bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
  def src(inp):
    if not bsdf: return None
    l = bsdf.inputs[inp].links
    if not l: return None
    n = l[0].from_node
    while n and n.type != 'TEX_IMAGE':
      ins = [i for i in n.inputs if i.links]; n = ins[0].links[0].from_node if ins else None
    return n.image if n else None
  for inp, tag in (('Base Color', 'diff'), ('Normal', 'nor_gl'), ('Roughness', 'arm'), ('Metallic', 'arm')):
    im = src(inp)
    if im and im.name not in kind: kind[im.name] = tag
for im in bpy.data.images:
  if im.size[0] == 0: continue
  tag = kind.get(im.name, 'diff')
  if max(im.size) > a.tex: im.scale(a.tex, a.tex)
  im.name = f'{a.id}_{tag}_1k'
out = os.path.join(a.out, a.id + '.gltf')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLTF_SEPARATE', export_image_format='JPEG', export_jpeg_quality=86, export_apply=True, export_yup=True, export_materials='EXPORT', export_texcoords=True, export_normals=True, use_selection=False)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
print(f'{a.id}: {tris} triangles · {max(v.x for v in bb) - min(v.x for v in bb):.2f} × {max(v.z for v in bb) - min(v.z for v in bb):.2f} (up) × {max(v.y for v in bb) - min(v.y for v in bb):.2f} m · {", ".join(sorted(set(kind.values())))} → {out}')
