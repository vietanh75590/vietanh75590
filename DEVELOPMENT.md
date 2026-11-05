# Orbit — Văn phòng AI 3D

Node.js 22 trở lên, không cần cài dependency. Chạy `npm start`, mặc định cổng 3000, bind 127.0.0.1. Chạy `npm test` để kiểm tra HTTP và tích hợp với provider giả lập cục bộ.

Để gọi AI thật, đặt `AGENT_API_KEY` trong môi trường máy chủ. Mặc định dùng OpenAI, model `gpt-4.1-mini`. Có thể đổi `AGENT_API_BASE` (URL gồm `/v1`) và `AGENT_MODEL` để dùng provider tương thích Chat Completions. Nếu dùng file `.env`, sao chép `.env.example` thành `.env`, điền key riêng và chạy `node --env-file=.env server.js`. Không đưa key vào trình duyệt hoặc Git.

Chọn một trong bốn cộng sự trong phòng, nhập nhiệm vụ rồi giao việc. Mỗi nhiệm vụ là một lần gọi AI độc lập với vai trò tương ứng. Kết quả chỉ lưu trong bộ nhớ trang và mất khi tải lại. Hình ảnh văn phòng dùng CSS 3D; nút đổi góc nhìn thay đổi góc chiếu.

Đây là bản phát triển dùng cá nhân: chưa có đăng nhập, lưu trữ lâu dài, phối hợp tự động nhiều agent hay công cụ thực thi tác vụ. Agent trả lời văn bản, không tự sửa file hoặc chạy lệnh. Không mở máy chủ ra Internet trước khi thêm xác thực và giới hạn sử dụng. `HOST` có thể đổi địa chỉ bind khi triển khai có kiểm soát.

Môi trường cloud đã cô lập: dùng checkout hiện có `/workspace/vietanh75590`, không tạo Git worktree trừ khi người dùng yêu cầu. Dịch vụ phải khởi động lại ở mỗi phiên; kiểm tra `/api/health`, sau đó thực hiện một nhiệm vụ thật để xác minh quyền API và hạn mức. Chỉ có key hiện diện không chứng minh kết nối AI hoạt động.
