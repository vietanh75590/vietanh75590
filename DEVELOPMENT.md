# Orbit — Văn phòng AI 3D

Node.js 22 trở lên, không cần cài dependency. Chạy `npm start`, mặc định cổng 3000, bind 127.0.0.1. Chạy `npm test` để kiểm tra HTTP và tích hợp với provider giả lập cục bộ.

Để gọi AI thật, đặt `AGENT_API_KEY` trong môi trường máy chủ. Mặc định dùng OpenAI, model `gpt-4.1-mini`. Có thể đổi `AGENT_API_BASE` (URL gồm `/v1`) và `AGENT_MODEL` để dùng provider tương thích Chat Completions. Nếu dùng file `.env`, sao chép `.env.example` thành `.env`, điền key riêng và chạy `node --env-file=.env server.js`. Không đưa key vào trình duyệt hoặc Git.

Chọn một trong bốn cộng sự trong phòng, nhập nhiệm vụ rồi giao việc. Mỗi nhiệm vụ là một lần gọi AI độc lập với vai trò tương ứng. Kết quả chỉ lưu trong bộ nhớ trang và mất khi tải lại. Hình ảnh văn phòng dùng CSS 3D; nút đổi góc nhìn thay đổi góc chiếu.

Đây là bản phát triển dùng cá nhân: chưa có đăng nhập, lưu trữ lâu dài, phối hợp tự động nhiều agent hay công cụ thực thi tác vụ. Agent trả lời văn bản, không tự sửa file hoặc chạy lệnh. Không mở máy chủ ra Internet trước khi thêm xác thực và giới hạn sử dụng. `HOST` có thể đổi địa chỉ bind khi triển khai có kiểm soát.

Môi trường cloud đã cô lập: dùng checkout hiện có `/workspace/vietanh75590`, không tạo Git worktree trừ khi người dùng yêu cầu. Dịch vụ phải khởi động lại ở mỗi phiên; kiểm tra `/api/health`, sau đó thực hiện một nhiệm vụ thật để xác minh quyền API và hạn mức. Chỉ có key hiện diện không chứng minh kết nối AI hoạt động.

## Agent tùy chỉnh và nhóm chat

Trong **Phòng giao việc**, mở **Thêm AI Agent**, nhập tên và vai trò/hướng dẫn (tối đa 20 agent tùy chỉnh). Agent mới xuất hiện trong danh sách dưới văn phòng; mô hình phòng 3D vẫn giữ bốn vị trí ban đầu. Tất cả agent dùng chung provider, model và key phía máy chủ, không phải tài khoản AI riêng.

Mở **Tạo nhóm chat**, nhập tên và chọn 1–6 thành viên, hoặc dùng nhóm chung có sẵn. Mỗi tin nhắn giao việc gọi API lần lượt cho từng thành viên; agent sau nhận phản hồi trước làm ngữ cảnh. Mỗi lần gọi nhận tối đa 12 tin nhắn gần nhất. Đây là hội thoại hỗ trợ giao việc, chưa có cơ chế tự thực thi, theo dõi tiến độ hoặc agent tự chạy nền. Lỗi sẽ dừng lượt, giữ các phản hồi đã thành công và hiển thị thông báo.

Danh sách agent, nhóm và tối đa 100 tin nhắn mỗi nhóm được lưu trong localStorage của trình duyệt (tối đa 20 nhóm). Không đồng bộ giữa thiết bị; xóa dữ liệu trình duyệt sẽ mất lịch sử. Tin nhắn chỉ được gửi đến provider khi giao việc. Không nhập dữ liệu nhạy cảm trên thiết bị dùng chung. Không có key thì vẫn tạo agent/nhóm được, nhưng không nhận phản hồi AI.

## Google Gemini

Hỗ trợ Gemini API native cho mọi agent và nhóm chat. Trong Render → dịch vụ → Environment, thêm `AGENT_PROVIDER=gemini` và `GEMINI_API_KEY` (nhập giá trị riêng từ Google AI Studio tại https://aistudio.google.com/apikey). Có thể đặt `GEMINI_MODEL=gemini-2.5-flash` hoặc model GenerateContent khác mà tài khoản có quyền dùng. Lưu và triển khai lại. Không nhập key vào giao diện chat hoặc commit key vào Git.

Nếu bỏ qua AGENT_PROVIDER, key Gemini có mặt sẽ ưu tiên Gemini; nếu đặt provider rõ ràng thì chỉ dùng provider đã chọn, không tự chuyển sang nhà cung cấp khác khi lỗi. AGENT_API_KEY/AGENT_MODEL chỉ dùng cho provider OpenAI. `/api/health` và giao diện hiển thị provider/model, không công khai key. Máy chủ gửi key Gemini qua header x-goog-api-key đến generativelanguage.googleapis.com với TLS. Cần cho phép domain này nếu môi trường hạn chế mạng. Key hiện diện không xác minh hạn mức hoặc quyền truy cập; kiểm tra bằng một nhiệm vụ thật sau khi cấu hình.

Trang công khai hiện chưa có đăng nhập hoặc giới hạn sử dụng. Bảo vệ truy cập trước khi bật key trên Internet để tránh bị người khác dùng hạn mức API. Việc gọi Gemini có thể bị tính phí tùy tài khoản/model/hạn mức.
