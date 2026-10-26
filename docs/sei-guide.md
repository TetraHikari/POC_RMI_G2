# How to read SEI (Screen Exposure Index)

[English](#english) · [ภาษาไทย](#ภาษาไทย)

## English

### How it's calculated

**SEI = exposure events ÷ store hours observed**

Example: Zone C had 6,115 exposure events over 196 store hours → SEI = 31.2 per hour.

### Why the same hours matter

Traffic swings a lot through the day (lunch and evening peaks). Every screen is measured over the
same dates and hours, so no screen looks better just because it was measured at a busy time. The
dashboard filters apply one time window to all screens.

### What the line around each dot means

On the SEI ranking chart, the line around each dot is the 95% confidence interval: the range the
screen's true SEI most likely falls in. When two screens' lines overlap, the data can't yet say
which one is really better.

### SEI vs exposure rate

SEI measures **volume**: how many views a screen delivers per hour, which is what advertisers pay
for. Exposure rate measures **efficiency**: the share of passers-by who actually look. A busy
entrance can have a high SEI but a low rate; a quiet checkout the opposite.

SEI ≈ foot traffic per hour × exposure rate.

### How CP Axtra can use it

Rank screens by SEI to set tiered ad prices (premium for the top screens) and to decide where new
screens should go. This is the post-POC pricing step, done only after the POC accuracy checks pass.

## ภาษาไทย

### วิธีคำนวณ

**SEI = จำนวนเหตุการณ์การรับชม ÷ จำนวนชั่วโมงทำการที่วัด**

ตัวอย่าง: โซน C มีเหตุการณ์การรับชม 6,115 ครั้ง ใน 196 ชั่วโมงทำการ → SEI = 31.2 ครั้งต่อชั่วโมง

### ทำไมต้องวัดในช่วงเวลาเดียวกัน

จำนวนคนในร้านแตกต่างกันมากในแต่ละช่วงของวัน (มีช่วงพีคตอนเที่ยงและตอนเย็น) ทุกหน้าจอจึงวัดในวันและชั่วโมงเดียวกัน
เพื่อไม่ให้หน้าจอใดได้เปรียบเพียงเพราะถูกวัดในช่วงที่คนเยอะ ตัวกรองบนแดชบอร์ดใช้ช่วงเวลาเดียวกันกับทุกหน้าจอ

### เส้นรอบจุดแต่ละจุดหมายถึงอะไร

ในกราฟอันดับ SEI เส้นรอบจุดคือช่วงความเชื่อมั่น 95% — ช่วงที่ค่า SEI จริงของหน้าจอน่าจะอยู่
ถ้าเส้นของสองหน้าจอทับซ้อนกัน แสดงว่าข้อมูลยังบอกไม่ได้ว่าจอไหนดีกว่าจริง

### SEI ต่างจากอัตราการรับชมอย่างไร

SEI วัด**ปริมาณ** คือจำนวนครั้งที่หน้าจอถูกรับชมต่อชั่วโมง ซึ่งเป็นสิ่งที่ผู้ลงโฆษณาจ่ายเงินซื้อ ส่วนอัตราการรับชมวัด**ประสิทธิภาพ**
คือสัดส่วนของคนที่เดินผ่านแล้วหันมามองจริง ทางเข้าที่คนพลุกพล่านอาจมี SEI สูงแต่อัตราต่ำ ส่วนจุดชำระเงินที่คนน้อยอาจกลับกัน

SEI ≈ จำนวนผู้สัญจรต่อชั่วโมง × อัตราการรับชม

### CP Axtra นำไปใช้อย่างไร

จัดอันดับหน้าจอตาม SEI เพื่อกำหนดราคาโฆษณาแบบเป็นขั้น (หน้าจออันดับต้นราคาพรีเมียม) และใช้ตัดสินใจว่าควรติดตั้งจอใหม่ที่ไหน
ขั้นตอนกำหนดราคานี้ทำหลังจบ POC และเมื่อผลตรวจความแม่นยำของ POC ผ่านแล้วเท่านั้น
