# Nhạc nền

Site hiện phát trực tiếp video YouTube BjE9A9hOQvk qua IFrame Player API, không cần MP3.
Cấu hình tại src/js/audio-control.js. Player hiển thị khi phát; nút loa dùng bật/tắt.
Mặc định bật trong phiên mới, nhớ lựa chọn tắt qua sessionStorage khi chuyển trang.
Autoplay có tiếng phụ thuộc trình duyệt; nếu bị chặn, thử lại sau tương tác hoặc bấm Play trong video.
Cần kết nối YouTube và video phải cho phép nhúng. Không tải hoặc tách audio từ video.
