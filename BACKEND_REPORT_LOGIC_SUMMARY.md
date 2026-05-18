# Backend Report Logic Summary

เอกสารฉบับนี้สรุปเฉพาะ logic ฝั่ง backend / data processing ของโปรเจกต์ dashboard นี้ เพื่อให้นำไปใช้ต่อในโปรเจกต์อื่นได้ โดยตัดส่วน frontend ออกทั้งหมด

## ภาพรวม

ระบบนี้ออกแบบมาเพื่อรับไฟล์ Excel ที่ผู้ใช้อัปโหลด แล้วแปลงข้อมูลเป็น schema กลาง จากนั้นคำนวณ report หลัก 3 ประเภท:

1. Branch Summary
2. Category Summary
3. Officer Summary

แนวคิดหลักคือ:
- อ่านไฟล์ Excel
- ตรวจจับประเภทไฟล์อัตโนมัติ
- แปลงข้อมูลดิบให้เป็นรูปแบบมาตรฐาน
- คำนวณ KPI / report metrics
- export ผลลัพธ์ต่อได้ เช่น CSV หรือส่งต่อให้ UI แสดงผล

---

## 1) Excel File Parsing

### หน้าที่
แปลงไฟล์ Excel ที่อัปโหลดเข้ามาเป็นข้อมูลที่ประมวลผลต่อได้

### แนวทาง
- รับไฟล์จาก upload
- อ่าน sheet ที่ต้องการ
- แปลงแถวใน Excel เป็น array/object
- ส่งข้อมูลต่อให้ตัว detector หรือ mapper

### สิ่งที่ควรย้ายไปโปรเจกต์อื่น
- Excel parser utility
- workbook / sheet reader
- row normalization

### หมายเหตุ
ถ้าย้ายไป backend จริง เช่น Node.js API ต้องเปลี่ยนจาก browser `FileReader` เป็นการอ่านจาก `Buffer` แทน

---

## 2) File Type Detection

### หน้าที่
ตรวจว่าไฟล์ที่อัปโหลดคือไฟล์ประเภทไหน โดยดูจาก header หรือ column key

### ประเภทที่รองรับในระบบนี้
- Category Master
- Targets
- Sales File

### เงื่อนไขตัวอย่าง
- มี `Cat & Sub Cat` หรือ `CAT Daily` → Category Master
- มี `STAFF ID` และ `BRANCH NAME` → Targets
- มี `Total Price` และ `Doc Date` → Sales File

### ประโยชน์
- ผู้ใช้ไม่ต้องระบุไฟล์ด้วยมือ
- ระบบจัดกลุ่มไฟล์ได้เอง
- ใช้งานกับหลายไฟล์ใน batch ได้

---

## 3) Data Mapping / Schema Normalization

หลังจาก detect ประเภทไฟล์แล้ว ระบบจะแปลงข้อมูลเป็น schema กลางเพื่อใช้คำนวณ report

### 3.1 Category Master Mapping

แปลงข้อมูล category mapping จาก Excel ให้เป็นโครงกลาง เช่น:
- `catSubCat`
- `groupCategory`

ใช้สำหรับ map category ย่อยใน sales ให้รวมเป็น category หลัก

### 3.2 Targets Mapping

แปลงข้อมูล target จาก Excel ให้เป็น schema กลาง เช่น:
- branch
- staff id
- officer name
- position
- target values ตาม category

### 3.3 Sales Data Mapping

แปลงข้อมูลขายให้เป็น schema กลาง เช่น:
- product code
- product name
- category name
- sub category
- branch name
- officer name
- total price
- document date

### ข้อสังเกต
- logic ส่วนนี้มักมี debug log เยอะในช่วงพัฒนา
- ถ้าใช้ในโปรเจกต์อื่น ควรทำให้เป็น pure mapper function
- ถ้าต้องรองรับหลาย template ให้แยก mapper ต่อ template

---

## 4) Batch File Processing

### หน้าที่
รับหลายไฟล์พร้อมกัน แล้วจัดกลุ่มไฟล์ตามประเภทและช่วงเวลา

### แนวคิดสำคัญ
สำหรับไฟล์ sales ระบบจะใช้วันที่ในไฟล์เพื่อเรียงลำดับ และจัดบทบาทของไฟล์ดังนี้:
- ไฟล์ใหม่สุด → currentPeriod
- ไฟล์ก่อนหน้า → lastMonth
- ไฟล์ก่อนหน้าถัดไป → lastYear

### เหตุผล
เพื่อให้ระบบคำนวณเปรียบเทียบได้อัตโนมัติ เช่น:
- เดือนปัจจุบันเทียบเดือนก่อน
- เดือนปัจจุบันเทียบปีก่อน

### ประโยชน์ต่อโปรเจกต์อื่น
ถ้าธุรกิจต้องรับหลายไฟล์และไม่อยากให้ผู้ใช้เลือกเองว่าไฟล์ไหนคือเดือนใด สามารถใช้ pattern นี้ได้เลย

---

## 5) Report Calculation Logic

## 5.1 Branch Summary

### หน้าที่
คำนวณผลรวมระดับสาขา

### ค่าที่ได้
- target
- actual
- achievement percentage
- forecast
- forecast percentage
- last month value
- month-over-month percentage
- last year value
- year-over-year percentage
- target per day
- actual per day
- diff per day

### สูตรที่ใช้
- `achPercent = actual / target * 100`
- `forecast = actual / currentDay * totalDays`
- `forecastPercent = forecast / target * 100`
- `momPercent = (actual - lastMonth) / lastMonth * 100`
- `yoyPercent = (actual - lastYear) / lastYear * 100`
- `targetDay = target / totalDays * currentDay`
- `diffDay = actual - targetDay`

### Logic หลัก
- group ตาม branch
- รวม target และยอดขาย
- filter category ถ้าจำเป็น
- คำนวณ KPI metrics จากยอดรวม

---

## 5.2 Category Summary

### หน้าที่
สรุปผลตามหมวดสินค้า

### จุดเด่น
ระบบ map category ย่อยจาก sales ให้เป็น category หลักผ่าน `categoryMaster` และ fallback rule

### ตัวอย่าง category
- iPhone
- Mac
- iPad
- Apple Watch
- SIM
- BTB

### Business rule สำคัญ
- หมวด `SIM` ใช้จำนวน `number` แทน `totalPrice`
- หมวดอื่นใช้ `totalPrice`

### Logic หลัก
- map sales item → group category
- aggregate ตามหมวดหลัก
- คำนวณ metrics แบบเดียวกับ branch summary

---

## 5.3 Officer Summary

### หน้าที่
สรุปผลราย officer / พนักงานขาย

### Logic หลัก
- match target ของแต่ละ officer
- match sales ตามชื่อ officer
- filter ตาม position ถ้าจำเป็น
- filter category ถ้าจำเป็น
- คำนวณ KPI metrics เหมือน branch summary

### ความท้าทาย
ชื่อจาก target file และ sales file อาจไม่ตรงกัน 100%

### แนวทางที่ใช้ในระบบ
มี helper สำหรับ cleaning และ matching ชื่อ เช่น:
- ตัดคำนำหน้า
- lower case
- ลบช่องว่างแปลก ๆ
- เทียบแบบ token / contains / startsWith
- รองรับ alias

### เหมาะกับโปรเจกต์อื่นเมื่อ
ข้อมูลชื่อคนมาจากหลายระบบ เช่น HR file, sales file, target file แล้ว format ไม่ตรงกัน

---

## 6) Helper / Utility Logic

### 6.1 `getGroupCategory`
ใช้ map category/subcategory/product name ไปเป็นหมวดหลัก

### 6.2 Name Cleaning / Matching
ใช้ทำ normalization ก่อนเทียบชื่อ เช่น officer name หรือ staff name

### 6.3 Number / Percent / Currency Formatters
ใช้ format ค่าเพื่อแสดงผลหรือ export

### 6.4 CSV Export Helper
ถ้าต้อง export report ออกมาใช้ต่อ สามารถสร้าง CSV ได้จากข้อมูลที่คำนวณแล้ว

---

## 7) โครงสร้างที่แนะนำเมื่อย้ายไปโปรเจกต์อื่น

### 7.1 `excel-parser`
หน้าที่:
- อ่าน Excel
- แปลงเป็น rows
- handle sheet / workbook

### 7.2 `file-detector`
หน้าที่:
- ตรวจประเภทไฟล์จาก header
- จำแนก category master / target / sales

### 7.3 `mappers`
หน้าที่:
- map raw Excel rows → schema กลาง
- แยก mapper ตามประเภทไฟล์

### 7.4 `report-calculators`
หน้าที่:
- calculateBranchSummary
- calculateCategorySummary
- calculateOfficerSummary

### 7.5 `name-utils`
หน้าที่:
- cleanName
- getGroupCategory
- match entities / alias

### 7.6 `export-utils`
หน้าที่:
- download CSV
- format output for external use

---

## 8) ถ้าจะใช้ใน Backend จริง

ถ้าจะย้าย logic นี้ไปใช้งานใน backend เช่น Express, NestJS, Fastify หรือ API route ของ Next.js ต้องปรับหลัก ๆ ดังนี้:

### สิ่งที่ต้องเปลี่ยน
- จาก browser `File` → เป็น `Buffer` หรือ file stream
- จาก `FileReader` → ใช้ server-side Excel reader
- จาก DOM upload → multipart/form-data endpoint

### Flow ที่แนะนำ
1. รับไฟล์จาก API
2. อ่าน buffer ของไฟล์ Excel
3. detect ประเภทไฟล์
4. map ข้อมูลให้เป็น schema กลาง
5. คำนวณ report
6. return JSON หรือ export file ต่อ

---

## 9) สิ่งที่ควรระวังเมื่อนำไปใช้ต่อ

### 9.1 Schema ของ Excel อาจเปลี่ยน
ถ้า template ใหม่ header ไม่เหมือนเดิม ต้องปรับ detector และ mapper

### 9.2 Business rule อาจต่างกัน
เช่น category บางประเภทใช้จำนวน บางประเภทใช้มูลค่า
ควรแยก rule ไว้ชัดเจน ไม่ hardcode ปนกับ UI

### 9.3 Matching ชื่ออาจไม่ตรง
ควรมี layer สำหรับ alias / normalization เสมอ

### 9.4 Debug log ควรถอดออกใน production
ถ้าใช้จริง ควรมี `NODE_ENV` guard หรือ logger level

---

## 10) สรุปสั้นที่สุด

logic ฝั่ง backend ของโปรเจกต์นี้ประกอบด้วย 4 ขั้นตอนหลัก:

1. อ่านไฟล์ Excel
2. ตรวจจับประเภทไฟล์
3. แปลงข้อมูลเป็น schema กลาง
4. คำนวณ report:
   - Branch Summary
   - Category Summary
   - Officer Summary

ถ้าจะนำไปใช้ในโปรเจกต์อื่น ให้ย้ายเป็น module แยกตามหน้าที่ และทำให้ส่วน parser / mapper / calculator เป็น pure function มากที่สุด

---

## 11) ไฟล์ที่ควรย้ายไปใช้ซ้ำ

- Excel parser
- file detector
- category mapper
- target mapper
- sales mapper
- name cleaning / matching helper
- report calculators
- CSV export helper

---

## 12) ข้อเสนอแนะสำหรับการ reuse

ถ้าเป้าหมายคือเอา logic นี้ไปใช้กับหลายโปรเจกต์ แนะนำให้วาง interface กลางของข้อมูลก่อน เช่น:

- `TargetRow`
- `SalesRow`
- `CategoryMapping`
- `BranchSummaryRow`
- `OfficerSummaryRow`
- `CategorySummaryRow`

แล้วให้แต่ละโปรเจกต์ทำ adapter แปลงข้อมูล Excel ของตัวเองเข้ารูปนี้

จากนั้น report calculators จะใช้ร่วมกันได้เกือบทั้งหมด
