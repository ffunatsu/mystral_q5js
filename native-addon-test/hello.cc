#include <node.h>

namespace hello {

void GetMessage(const v8::FunctionCallbackInfo<v8::Value>& args) {
  const auto isolate = args.GetIsolate();
  args.GetReturnValue().Set(
      v8::String::NewFromUtf8(isolate, "hello from C++")
          .ToLocalChecked());
}

void Initialize(v8::Local<v8::Object> exports) {
  NODE_SET_METHOD(exports, "message", GetMessage);
}

NODE_MODULE_INIT() {
  Initialize(exports);
}

}  // namespace hello
