use gv_video::GVVideo;
use std::io::Cursor;

#[no_mangle]
pub extern "C" fn gv_alloc(size: usize) -> *mut u8 {
    let layout = std::alloc::Layout::array::<u8>(size.max(1)).unwrap();
    unsafe { std::alloc::alloc(layout) }
}

#[no_mangle]
pub extern "C" fn gv_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() {
        return;
    }
    let layout = std::alloc::Layout::array::<u8>(size.max(1)).unwrap();
    unsafe { std::alloc::dealloc(ptr, layout) };
}

#[no_mangle]
pub unsafe extern "C" fn read_gv_header(
    input_ptr: *const u8,
    input_len: usize,
    output_ptr: *mut u8,
) -> i32 {
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }

    let bytes = std::slice::from_raw_parts(input_ptr, input_len);
    let video = match GVVideo::load(Cursor::new(bytes)) {
        video => video,
    };

    let output = std::slice::from_raw_parts_mut(output_ptr, 24);
    output[0..4].copy_from_slice(&video.header.width.to_le_bytes());
    output[4..8].copy_from_slice(&video.header.height.to_le_bytes());
    output[8..12].copy_from_slice(&video.header.frame_count.to_le_bytes());
    output[12..16].copy_from_slice(&video.header.fps.to_bits().to_le_bytes());
    output[16..20].copy_from_slice(&(video.header.format as u32).to_le_bytes());
    output[20..24].copy_from_slice(&video.header.frame_bytes.to_le_bytes());
    0
}

#[no_mangle]
pub unsafe extern "C" fn read_gv_frame_compressed(
    input_ptr: *const u8,
    input_len: usize,
    frame_index: u32,
    output_ptr: *mut u8,
    output_capacity: usize,
) -> i32 {
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }

    let bytes = std::slice::from_raw_parts(input_ptr, input_len);
    let mut video = GVVideo::load(Cursor::new(bytes));
    let frame = match video.read_frame_compressed(frame_index) {
        Ok(frame) => frame,
        Err(_) => return -2,
    };
    if frame.len() > output_capacity {
        return -3;
    }

    std::slice::from_raw_parts_mut(output_ptr, frame.len()).copy_from_slice(&frame);
    frame.len() as i32
}

#[no_mangle]
pub unsafe extern "C" fn read_gv_frame_rgba(
    input_ptr: *const u8,
    input_len: usize,
    frame_index: u32,
    output_ptr: *mut u8,
    output_capacity: usize,
) -> i32 {
    if input_ptr.is_null() || output_ptr.is_null() {
        return -1;
    }

    let bytes = std::slice::from_raw_parts(input_ptr, input_len);
    let mut video = GVVideo::load(Cursor::new(bytes));
    let frame = match video.read_frame(frame_index) {
        Ok(frame) => frame,
        Err(_) => return -2,
    };
    let rgba = gv_video::get_rgba_vec_from_frame(&frame);
    if rgba.len() > output_capacity {
        return -3;
    }

    std::slice::from_raw_parts_mut(output_ptr, rgba.len()).copy_from_slice(&rgba);
    rgba.len() as i32
}

#[no_mangle]
pub extern "C" fn gv_is_supported_format(format: u32) -> bool {
    matches!(format, 1 | 3 | 5 | 7)
}
