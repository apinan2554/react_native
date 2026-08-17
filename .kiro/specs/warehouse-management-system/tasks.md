# แผนการพัฒนา: ระบบจัดการคลังสินค้า (Warehouse Management System)

## ภาพรวม

พัฒนาแอป React Native WMS ที่ใช้ SQLite เก็บข้อมูล, Bottom Tab Navigation 6 หน้าจอ, และ react-native-paper UI โดยใช้สถาปัตยกรรม Singleton DatabaseService → Screens

## Tasks

- [ ] 1. ติดตั้ง Dependencies และสร้างโครงสร้างโปรเจค
  - [x] 1.1 ติดตั้ง dependencies ที่จำเป็น (react-native-sqlite-storage, react-native-paper, @react-native-picker/picker, react-native-toast-message, react-native-screens, react-native-vector-icons)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 1.2 สร้างโครงสร้างโฟลเดอร์ (src/db, src/screens, src/types, src/constants, src/navigation) และไฟล์ types/index.ts, constants/zones.ts
    - สร้าง TypeScript interfaces: Product, StockEntry, TransactionLog, DashboardData
    - สร้าง Zone constants: ZONES, ALL_SUB_ZONES, getMainZone helper
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [ ] 2. พัฒนา DatabaseService (Singleton + SQLite)
  - [x] 2.1 สร้าง DatabaseService class แบบ Singleton พร้อม initialize method ที่สร้างตาราง products, stock, logs
    - ใช้ react-native-sqlite-storage
    - สร้างตารางพร้อม constraints (CHECK, FOREIGN KEY, CASCADE DELETE)
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4_
  - [ ] 2.2 เพิ่ม CRUD methods สำหรับ Products (getAllProducts, addProduct, updateProduct, deleteProduct)
    - deleteProduct ต้อง cascade ลบ stock entries ที่เกี่ยวข้อง
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 13.2_
  - [ ] 2.3 เพิ่ม Stock query methods (getStockByZone, getStockByProduct, getTotalStockByProduct) และ Transaction methods (inbound, transfer, outbound)
    - inbound: เพิ่ม stock + บันทึก log
    - transfer: ใช้ DB transaction เพื่อ atomicity, ตรวจสอบ qty ไม่เกิน stock และ fromZone ≠ toZone
    - outbound: ตรวจสอบ qty ไม่เกิน stock, ลด stock + บันทึก log
    - _Requirements: 8.2, 8.3, 9.3, 9.4, 9.5, 9.6, 10.3, 10.4, 10.5, 13.1, 13.3, 13.4_
  - [ ] 2.4 เพิ่ม Dashboard methods (getDashboardSummary, getLowStockProducts, getRecentLogs)
    - getDashboardSummary: คำนวณ totalStock, zone stock (A/B/C), totalProducts, totalTransactions
    - getLowStockProducts: สินค้าที่ stock รวม < reorderPoint
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 2.5 เขียน property-based tests สำหรับ DatabaseService
    - **Property 1: Product Round-Trip** — จัดเก็บและเรียกคืนข้อมูลสินค้าได้ถูกต้อง
    - **Property 2: Transfer Total Stock Invariant** — ผลรวมสต็อกคงที่หลังโอนย้าย
    - **Property 3: Inbound Increases Stock** — รับเข้าเพิ่มสต็อกถูกต้อง
    - **Property 4: Outbound Decreases Stock** — เบิกจ่ายลดสต็อกถูกต้อง
    - **Property 5: Cascade Delete** — ลบสินค้าลบสต็อกทั้งหมด
    - **Property 6: Non-Negative Stock Invariant** — สต็อกไม่ติดลบ
    - **Property 7: Low Stock Detection** — ตรวจจับสต็อกต่ำ
    - **Property 8: Zone Stock Aggregation** — ผลรวมสต็อกตามโซน
    - **Validates: Requirements 2.1, 5.1, 5.4, 6.6, 7.2, 7.3, 8.2, 8.3, 9.3, 10.3, 10.4, 13.1, 13.2, 13.3**

- [ ] 3. Checkpoint - ตรวจสอบ DatabaseService
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. พัฒนา Navigation และ App Shell
  - [ ] 4.1 สร้าง AppNavigator.tsx ด้วย Bottom Tab Navigation 6 แท็บ (Dashboard, Products, Zones, Inbound, Transfer, Outbound)
    - ใช้ @react-navigation/bottom-tabs
    - ตรวจจับ phone/tablet ด้วย Dimensions API เพื่อสลับ Bottom Tab / Side Navigation
    - ตั้งค่าสี Material Design (blueGrey เป็นสีหลัก)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 11.2_
  - [ ] 4.2 อัปเดต App.tsx ให้ใช้ NavigationContainer + AppNavigator + PaperProvider + Toast
    - _Requirements: 4.1, 12.3, 12.5_

- [ ] 5. พัฒนาหน้าจอทั้ง 6 จอ
  - [ ] 5.1 DashboardScreen — แสดง 4 การ์ดสรุปสต็อก (รวม, Zone A/B/C), จำนวนสินค้า, จำนวน transaction, รายการแจ้งเตือนสต็อกต่ำ
    - ใช้ react-native-paper Card components
    - ไฮไลท์สีส้มสำหรับสินค้าสต็อกต่ำ
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.1, 11.3_
  - [ ] 5.2 ProductScreen — แสดงรายการสินค้า, Modal เพิ่ม/แก้ไข, ลบพร้อม confirmation, ไฮไลท์สต็อกต่ำ
    - Form validation: name, unit, category, reorderPoint required
    - แสดง error message เมื่อฟอร์มไม่ครบ
    - Toast notification เมื่อสำเร็จ
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 11.4_
  - [ ] 5.3 ZoneScreen — แสดงโครงสร้างคลังแบบ Accordion (3 โซนหลัก → 3 โซนย่อยแต่ละ), แสดงสต็อกรวมแต่ละโซน
    - ใช้ react-native-paper List.Accordion
    - แสดงจำนวนสต็อกรวมของโซนหลักและโซนย่อย
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 5.4 InboundScreen — ฟอร์มเลือกสินค้า + โซนปลายทาง + จำนวน, validation, Toast สำเร็จ
    - ใช้ @react-native-picker/picker สำหรับ dropdown
    - Validation: จำนวน > 0
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.4_
  - [ ] 5.5 TransferScreen — ฟอร์มเลือกโซนต้นทาง → แสดงสินค้าที่มีสต็อก → โซนปลายทาง + จำนวน, validation, Toast สำเร็จ
    - Validation: จำนวนไม่เกิน stock, โซนต้นทาง ≠ ปลายทาง
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.4_
  - [ ] 5.6 OutboundScreen — ฟอร์มเลือกโซน → สินค้าที่มีสต็อก → จำนวน, validation, แสดงประวัติ 10 รายการล่าสุด, Toast สำเร็จ
    - Validation: จำนวนไม่เกิน stock
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.4_

- [ ] 6. Checkpoint สุดท้าย - ทดสอบการทำงานร่วมกัน
  - Ensure all tests pass, ask the user if questions arise.
  - ตรวจสอบว่าทุก screen เรียก DatabaseService ได้ถูกต้อง
  - ตรวจสอบ navigation ทำงานครบทุกแท็บ
  - ตรวจสอบ Toast notifications แสดงผลเมื่อทำรายการสำเร็จ

## Notes

- Tasks ที่มี `*` เป็น optional สามารถข้ามได้
- ทุก screen ใช้ภาษาไทยในการแสดงผล (Requirement 11.1)
- ใช้ react-native-paper เป็น UI library หลัก
- Property-based tests ใช้ fast-check ที่มีอยู่แล้วใน package.json
