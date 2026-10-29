# Icons

Bộ icon nét mảnh (line-art), vẽ tay bằng SVG, dùng `currentColor` nên tự đổi màu
theo `color` của phần tử cha.

Quy ước chung:

- `viewBox="0 0 32 32"`
- `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`
- `stroke-linecap="round"`, `stroke-linejoin="round"`
- Kích thước hiển thị do CSS quyết định

Vì dùng `currentColor`, icon không cần file riêng cho từng trạng thái hover —
chỉ cần đổi `color` ở CSS.

Trong `index.html` icon được **nhúng inline** (không dùng `<img>`) để tránh thêm
request mạng và để đổi màu được bằng CSS. Các file ở đây là nguồn để tái sử dụng.

## Value cards — `#about` (`.value-icon`)

Khung nền 64x64, icon 30x30, màu đỏ `--color-primary`; hover đổi nền sang
`--gradient-primary` và nét icon thành trắng.

| File | Ý nghĩa |
|:---|:---|
| `art.svg` | Nghệ thuật — khung tranh phong cảnh (mặt trời + núi) |
| `story.svg` | Câu chuyện — sách mở có gáy và các dòng chữ |
| `tech.svg` | Công nghệ — khung ngắm bốn góc + ô mã QR |
| `spread.svg` | Lan tỏa — địa cầu có kinh tuyến, vĩ tuyến |

## Step cards — `#product` (`.step-icon`)

Không có khung nền (phía trên đã có vòng tròn `.step-number`), icon 34x34,
màu đỏ `--color-primary`; hover nhấc nhẹ `translateY(-3px)`.

| File | Ý nghĩa |
|:---|:---|
| `postcard.svg` | Chọn Bưu Thiếp — bưu thiếp/phong bì có tem |
| `scan.svg` | Quét Mã QR — điện thoại có ô QR và vệt quét |
| `explore.svg` | Khám Phá Câu Chuyện — kính lúp soi cuốn sách |

## Ghi chú thiết kế

Icon phải đọc ra được ở 30–34px. Hai bản đã bị loại vì lý do này:

- **giá vẽ** cho "Nghệ Thuật" → trông như máy quay trên chân tripod
- **la bàn** cho "Khám Phá" → kim nhỏ nên trông như ngọn lửa / vòng tròn có vệt

Nên xem icon ở đúng kích thước hiển thị thật trước khi chốt.
