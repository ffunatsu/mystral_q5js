use std::ffi::CStr;
use std::os::raw::{c_char, c_int, c_void};

struct Device {
    port: String,
    baudrate: c_int,
    bytes_written: usize,
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_connect(
    port: *const c_char,
    baudrate: c_int,
) -> *mut c_void {
    if port.is_null() {
        return std::ptr::null_mut();
    }

    let port = match CStr::from_ptr(port).to_str() {
        Ok(value) => value.to_owned(),
        Err(_) => return std::ptr::null_mut(),
    };

    Box::into_raw(Box::new(Device {
        port,
        baudrate,
        bytes_written: 0,
    })) as *mut c_void
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_write(
    handle: *mut c_void,
    data: *const c_void,
    length: usize,
) -> c_int {
    if handle.is_null() || (data.is_null() && length != 0) {
        return -1;
    }

    let device = &mut *(handle as *mut Device);
    device.bytes_written = device.bytes_written.saturating_add(length);

    // This test DLL does not access hardware. It records the buffer length and
    // returns it so the JavaScript FFI example can verify the ABI boundary.
    length as c_int
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_close(handle: *mut c_void) {
    if !handle.is_null() {
        drop(Box::from_raw(handle as *mut Device));
    }
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_version() -> c_int {
    1
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_add(left: c_int, right: c_int) -> c_int {
    left + right
}

#[no_mangle]
pub unsafe extern "C" fn ffi_test_add_double(left: f64, right: f64) -> f64 {
    left + right
}
