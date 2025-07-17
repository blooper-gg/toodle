export default /*wgsl*/ `
// Input texture from which cropped data is read
@group(0) @binding(0)
var input_texture_crop: texture_2d<f32>;

// Output texture where cropped image is written
@group(0) @binding(1)
var output_texture: texture_storage_2d<rgba8unorm, write>;

// Bounding box passed in as a uniform (not atomic anymore)
struct bounding_box_uniform {
    min_x: u32,
    min_y: u32,
    max_x: u32,
    max_y: u32,
    layer: u32,
};

@group(0) @binding(2)
var<uniform> bounds_uniform: bounding_box_uniform;

// Compute shader to crop the input texture to the bounding box and output it
@compute @workgroup_size(8, 8)
fn crop_and_output(@builtin(global_invocation_id) gid: vec3<u32>) {
    let size = textureDimensions(input_texture_crop).xy;

    let crop_width = bounds_uniform.max_x - bounds_uniform.min_x + 1u;
    let crop_height = bounds_uniform.max_y - bounds_uniform.min_y + 1u;

    if (gid.x >= crop_width || gid.y >= crop_height) {
        return;
    }

    let src_coord = vec2<i32>(
        i32(bounds_uniform.min_x + gid.x),
        i32(bounds_uniform.min_y + gid.y)
    );

    let dst_coord = vec2<i32>(i32(gid.x), i32(gid.y));
    let pixel = textureLoad(input_texture_crop, src_coord, 0);
    textureStore(output_texture, dst_coord, pixel);
}
`;
