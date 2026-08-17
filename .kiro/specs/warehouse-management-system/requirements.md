# เอกสารข้อกำหนดความต้องการ (Requirements Document)

## บทนำ

ระบบจัดการคลังสินค้า (Warehouse Management System - WMS) เป็นแอปพลิเคชัน React Native สำหรับจัดการสินค้าภายในคลังสินค้า รองรับการรับเข้า โอนย้าย และเบิกจ่ายสินค้าระหว่างโซนต่าง ๆ โดยใช้ฐานข้อมูล SQLite สำหรับจัดเก็บข้อมูลแบบ Local Persistent Storage แอปประกอบด้วย 6 หน้าจอหลัก พร้อม Bottom Tab Navigation และแสดงผลเป็นภาษาไทย

## อภิธานศัพท์ (Glossary)

- **WMS_App**: แอปพลิเคชัน React Native ระบบจัดการคลังสินค้า
- **Dashboard_Screen**: หน้าจอแสดงข้อมูลสรุปภาพรวมคลังสินค้า
- **Product_Master_Screen**: หน้าจอจัดการข้อมูลหลักสินค้า (CRUD)
- **Zone_Screen**: หน้าจอแสดงโครงสร้างคลังสินค้าแบบ Accordion
- **Inbound_Screen**: หน้าจอรับสินค้าเข้าคลัง
- **Transfer_Screen**: หน้าจอโอนย้ายสินค้าระหว่างโซน
- **Outbound_Screen**: หน้าจอเบิกจ่ายสินค้าออกจากคลัง
- **Database_Layer**: ชั้นจัดการฐานข้อมูล SQLite แบบ Singleton
- **Navigation_System**: ระบบนำทางระหว่างหน้าจอ (Bottom Tab / Side Navigation)
- **Product**: ข้อมูลสินค้า ประกอบด้วย id, name, unit, category, description, reorderPoint
- **StockEntry**: ข้อมูลสต็อกสินค้าตามโซน ใช้ composite key (productId + zone)
- **TransactionLog**: บันทึกรายการเคลื่อนไหวสินค้า (inbound/outbound/transfer)
- **Zone**: พื้นที่จัดเก็บสินค้าภายในคลัง แบ่งเป็น Main Zone (A, B, C) และ Sub-Zone (A1-A3, B1-B3, C1-C3)
- **Reorder_Point**: จุดสั่งซื้อใหม่ เมื่อสต็อกต่ำกว่าค่านี้จะแสดงการแจ้งเตือน
- **Toast_Notification**: ข้อความแจ้งเตือนชั่วคราวบนหน้าจอเมื่อทำรายการสำเร็จ

## ข้อกำหนดความต้องการ (Requirements)

### Requirement 1: การจัดเก็บข้อมูลด้วย SQLite

**User Story:** ในฐานะผู้ใช้งาน ฉันต้องการให้ข้อมูลถูกจัดเก็บแบบ Persistent เพื่อที่ข้อมูลจะไม่สูญหายเมื่อปิดแอป

#### Acceptance Criteria

1. WHEN WMS_App เริ่มทำงานครั้งแรก, THE Database_Layer SHALL สร้างตาราง products, stock, และ logs ในฐานข้อมูล SQLite
2. WHEN WMS_App เริ่มทำงาน, THE Database_Layer SHALL โหลดข้อมูลทั้งหมดจากฐานข้อมูลเข้าสู่ State ของแอป
3. WHEN ผู้ใช้ทำการเปลี่ยนแปลงข้อมูล (เพิ่ม/แก้ไข/ลบ/รับเข้า/โอนย้าย/เบิกจ่าย), THE Database_Layer SHALL บันทึกการเปลี่ยนแปลงลงฐานข้อมูลทันที
4. THE Database_Layer SHALL ใช้รูปแบบ Singleton เพื่อให้มี Instance เดียวในการเข้าถึงฐานข้อมูลทั้งแอป

### Requirement 2: โครงสร้างข้อมูลสินค้า (Product)

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการจัดเก็บข้อมูลสินค้าอย่างครบถ้วน เพื่อติดตามและจัดการสินค้าได้อย่างมีประสิทธิภาพ

#### Acceptance Criteria

1. THE Database_Layer SHALL จัดเก็บข้อมูล Product ที่ประกอบด้วย id (auto-increment), name (text, required), unit (text, required), category (text, required), description (text, optional), และ reorderPoint (integer, required)
2. THE Database_Layer SHALL รองรับหมวดหมู่สินค้า 4 ประเภท: ไฟฟ้า, Accessory, อิเล็กทรอนิกส์, พลาสติก
3. THE Database_Layer SHALL จัดเก็บข้อมูล StockEntry โดยใช้ composite key จาก productId และ zone พร้อม quantity (integer)
4. THE Database_Layer SHALL จัดเก็บข้อมูล TransactionLog ที่ประกอบด้วย id (auto-increment), type (inbound/outbound/transfer), productId, fromZone, toZone, quantity, และ timestamp

### Requirement 3: โครงสร้างคลังสินค้าและโซน

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการจัดแบ่งพื้นที่คลังเป็นโซนย่อย เพื่อจัดระเบียบการจัดเก็บสินค้า

#### Acceptance Criteria

1. THE WMS_App SHALL กำหนดคลังสินค้าหลัก 1 แห่งชื่อ "Main Warehouse"
2. THE WMS_App SHALL แบ่งคลังเป็น 3 โซนหลัก: Zone A, Zone B, Zone C
3. THE WMS_App SHALL แบ่งแต่ละโซนหลักเป็น 3 โซนย่อย: Zone A มี A1, A2, A3; Zone B มี B1, B2, B3; Zone C มี C1, C2, C3 (รวม 9 โซนย่อย)

### Requirement 4: ระบบนำทาง (Navigation)

**User Story:** ในฐานะผู้ใช้งาน ฉันต้องการเข้าถึงหน้าจอต่าง ๆ ได้สะดวก เพื่อใช้งานแอปได้อย่างรวดเร็ว

#### Acceptance Criteria

1. THE Navigation_System SHALL แสดง Bottom Tab Navigation ที่มี 6 แท็บ: Dashboard, Products, Zones, Inbound, Transfer, Outbound
2. WHILE ผู้ใช้ใช้งานบนอุปกรณ์โทรศัพท์, THE Navigation_System SHALL แสดง Bottom Tab Navigation
3. WHILE ผู้ใช้ใช้งานบนอุปกรณ์แท็บเล็ต, THE Navigation_System SHALL แสดง Side Navigation แทน Bottom Tab
4. WHEN ผู้ใช้กดแท็บใดแท็บหนึ่ง, THE Navigation_System SHALL นำทางไปยังหน้าจอที่ตรงกับแท็บนั้น

### Requirement 5: หน้าจอ Dashboard

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการเห็นภาพรวมของคลังสินค้าในหน้าจอเดียว เพื่อติดตามสถานะคลังได้ทันที

#### Acceptance Criteria

1. THE Dashboard_Screen SHALL แสดง 4 การ์ดสรุป: จำนวนสต็อกรวมทั้งหมด, จำนวนสต็อก Zone A, จำนวนสต็อก Zone B, จำนวนสต็อก Zone C
2. THE Dashboard_Screen SHALL แสดงจำนวนสินค้าทั้งหมดในระบบ
3. THE Dashboard_Screen SHALL แสดงจำนวนรายการเคลื่อนไหว (Transaction) ทั้งหมด
4. THE Dashboard_Screen SHALL แสดงรายการแจ้งเตือนสินค้าที่มีสต็อกต่ำกว่า Reorder_Point
5. WHEN ข้อมูลสต็อกมีการเปลี่ยนแปลง, THE Dashboard_Screen SHALL อัปเดตข้อมูลสรุปทันที

### Requirement 6: หน้าจอจัดการสินค้า (Product Master)

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการเพิ่ม แก้ไข และลบสินค้าได้ เพื่อจัดการข้อมูลหลักสินค้าให้เป็นปัจจุบัน

#### Acceptance Criteria

1. THE Product_Master_Screen SHALL แสดงรายการสินค้าทั้งหมดพร้อมจำนวนสต็อกรวมของแต่ละสินค้า
2. WHEN ผู้ใช้กดปุ่มเพิ่มสินค้า, THE Product_Master_Screen SHALL แสดง Modal สำหรับกรอกข้อมูลสินค้าใหม่
3. WHEN ผู้ใช้ส่งฟอร์มเพิ่มสินค้า, THE Product_Master_Screen SHALL ตรวจสอบว่า name, unit, category, และ reorderPoint ถูกกรอกครบถ้วน
4. IF ผู้ใช้ส่งฟอร์มที่มีข้อมูลไม่ครบถ้วน, THEN THE Product_Master_Screen SHALL แสดงข้อความแจ้งเตือนระบุฟิลด์ที่ต้องกรอก
5. WHEN ผู้ใช้กดแก้ไขสินค้า, THE Product_Master_Screen SHALL แสดง Modal พร้อมข้อมูลเดิมสำหรับแก้ไข
6. WHEN ผู้ใช้ยืนยันการลบสินค้า, THE Product_Master_Screen SHALL ลบข้อมูลสินค้าพร้อมลบข้อมูล StockEntry ที่เกี่ยวข้องทั้งหมด (Cascade Delete)
7. THE Product_Master_Screen SHALL ไฮไลท์สินค้าที่มีสต็อกรวมต่ำกว่า Reorder_Point ด้วยสีส้ม

### Requirement 7: หน้าจอคลังสินค้าและโซน (Warehouse & Zone)

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการดูโครงสร้างคลังและจำนวนสต็อกในแต่ละโซน เพื่อวางแผนการจัดเก็บสินค้า

#### Acceptance Criteria

1. THE Zone_Screen SHALL แสดงโครงสร้างคลังแบบ Expandable Accordion โดยมี 3 โซนหลัก (Zone A, Zone B, Zone C)
2. WHEN ผู้ใช้กดขยายโซนหลัก, THE Zone_Screen SHALL แสดง 3 โซนย่อยภายในพร้อมจำนวนสต็อกรวมของแต่ละโซนย่อย
3. THE Zone_Screen SHALL แสดงจำนวนสต็อกรวมของแต่ละโซนหลัก

### Requirement 8: หน้าจอรับสินค้าเข้า (Inbound)

**User Story:** ในฐานะพนักงานคลัง ฉันต้องการบันทึกการรับสินค้าเข้าคลัง เพื่อให้ข้อมูลสต็อกเป็นปัจจุบัน

#### Acceptance Criteria

1. THE Inbound_Screen SHALL แสดงฟอร์มสำหรับเลือกสินค้า, เลือกโซนปลายทาง, และกรอกจำนวน
2. WHEN ผู้ใช้เลือกสินค้าและโซนแล้วกรอกจำนวนและกดยืนยัน, THE Inbound_Screen SHALL เพิ่มจำนวนสต็อกของสินค้าในโซนที่เลือก
3. WHEN การรับสินค้าเข้าสำเร็จ, THE Inbound_Screen SHALL บันทึก TransactionLog ชนิด "inbound" พร้อม toZone, productId, quantity, และ timestamp
4. IF ผู้ใช้กรอกจำนวนเป็น 0 หรือน้อยกว่า, THEN THE Inbound_Screen SHALL แสดงข้อความแจ้งเตือนว่าจำนวนต้องมากกว่า 0
5. WHEN การรับสินค้าเข้าสำเร็จ, THE Inbound_Screen SHALL แสดง Toast_Notification แจ้งความสำเร็จ

### Requirement 9: หน้าจอโอนย้ายสินค้า (Stock Transfer)

**User Story:** ในฐานะพนักงานคลัง ฉันต้องการโอนย้ายสินค้าระหว่างโซน เพื่อจัดระเบียบและกระจายสินค้าในคลัง

#### Acceptance Criteria

1. THE Transfer_Screen SHALL แสดงฟอร์มสำหรับเลือกโซนต้นทาง, เลือกสินค้า (จากโซนต้นทาง), เลือกโซนปลายทาง, และกรอกจำนวน
2. WHEN ผู้ใช้เลือกโซนต้นทาง, THE Transfer_Screen SHALL แสดงเฉพาะสินค้าที่มีสต็อกในโซนต้นทางนั้น
3. WHEN ผู้ใช้ยืนยันการโอนย้าย, THE Transfer_Screen SHALL ลดจำนวนสต็อกจากโซนต้นทางและเพิ่มจำนวนสต็อกในโซนปลายทางตามจำนวนที่ระบุ
4. WHEN การโอนย้ายสำเร็จ, THE Transfer_Screen SHALL บันทึก TransactionLog ชนิด "transfer" พร้อม fromZone, toZone, productId, quantity, และ timestamp
5. IF ผู้ใช้กรอกจำนวนมากกว่าสต็อกที่มีในโซนต้นทาง, THEN THE Transfer_Screen SHALL แสดงข้อความแจ้งเตือนว่าจำนวนเกินสต็อกที่มี
6. IF ผู้ใช้เลือกโซนต้นทางและปลายทางเป็นโซนเดียวกัน, THEN THE Transfer_Screen SHALL แสดงข้อความแจ้งเตือนว่าโซนต้นทางและปลายทางต้องไม่ซ้ำกัน
7. WHEN การโอนย้ายสำเร็จ, THE Transfer_Screen SHALL แสดง Toast_Notification แจ้งความสำเร็จ

### Requirement 10: หน้าจอเบิกจ่ายสินค้า (Outbound)

**User Story:** ในฐานะพนักงานคลัง ฉันต้องการบันทึกการเบิกจ่ายสินค้าออกจากคลัง เพื่อให้ข้อมูลสต็อกเป็นปัจจุบัน

#### Acceptance Criteria

1. THE Outbound_Screen SHALL แสดงฟอร์มสำหรับเลือกโซนต้นทาง, เลือกสินค้า, และกรอกจำนวน
2. WHEN ผู้ใช้เลือกโซน, THE Outbound_Screen SHALL แสดงเฉพาะสินค้าที่มีสต็อกในโซนนั้น
3. WHEN ผู้ใช้ยืนยันการเบิกจ่าย, THE Outbound_Screen SHALL ลดจำนวนสต็อกของสินค้าในโซนที่เลือกตามจำนวนที่ระบุ
4. WHEN การเบิกจ่ายสำเร็จ, THE Outbound_Screen SHALL บันทึก TransactionLog ชนิด "outbound" พร้อม fromZone, productId, quantity, และ timestamp
5. IF ผู้ใช้กรอกจำนวนมากกว่าสต็อกที่มีในโซน, THEN THE Outbound_Screen SHALL แสดงข้อความแจ้งเตือนว่าจำนวนเกินสต็อกที่มี
6. THE Outbound_Screen SHALL แสดงประวัติการเบิกจ่าย 10 รายการล่าสุด
7. WHEN การเบิกจ่ายสำเร็จ, THE Outbound_Screen SHALL แสดง Toast_Notification แจ้งความสำเร็จ

### Requirement 11: การออกแบบ UI/UX

**User Story:** ในฐานะผู้ใช้งาน ฉันต้องการให้แอปมีหน้าตาสวยงามและใช้งานง่าย เพื่อประสบการณ์การใช้งานที่ดี

#### Acceptance Criteria

1. THE WMS_App SHALL แสดงข้อความและป้ายกำกับเป็นภาษาไทย
2. THE WMS_App SHALL ใช้ชุดสี Material Design โดยมีสีหลักเป็น blueGrey, Zone A ใช้สีน้ำเงิน (blue), Zone B ใช้สี teal, Zone C ใช้สี indigo
3. THE WMS_App SHALL ไฮไลท์สินค้าที่มีสต็อกต่ำกว่า Reorder_Point ด้วยสีส้ม (orange)
4. WHEN ผู้ใช้ทำรายการสำเร็จ (รับเข้า/โอนย้าย/เบิกจ่าย/เพิ่มสินค้า/แก้ไขสินค้า), THE WMS_App SHALL แสดง Toast_Notification แจ้งความสำเร็จ

### Requirement 12: Tech Stack และ Dependencies

**User Story:** ในฐานะนักพัฒนา ฉันต้องการให้แอปใช้ไลบรารีที่เหมาะสม เพื่อพัฒนาและบำรุงรักษาได้ง่าย

#### Acceptance Criteria

1. THE WMS_App SHALL ใช้ react-native-sqlite-storage สำหรับจัดการฐานข้อมูล SQLite
2. THE WMS_App SHALL ใช้ @react-navigation/bottom-tabs สำหรับ Bottom Tab Navigation
3. THE WMS_App SHALL ใช้ react-native-paper สำหรับ UI Components ตาม Material Design
4. THE WMS_App SHALL ใช้ @react-native-picker/picker สำหรับ Dropdown Selection
5. THE WMS_App SHALL ใช้ react-native-toast-message สำหรับแสดง Toast Notification

### Requirement 13: Data Integrity (ความสมบูรณ์ของข้อมูล)

**User Story:** ในฐานะผู้จัดการคลัง ฉันต้องการให้ข้อมูลสต็อกมีความถูกต้องเสมอ เพื่อป้องกันความผิดพลาดในการจัดการคลัง

#### Acceptance Criteria

1. WHEN การโอนย้ายสินค้าเกิดขึ้น, THE Database_Layer SHALL ทำให้ผลรวมสต็อกทั้งหมดของสินค้านั้นคงที่ก่อนและหลังการโอนย้าย (Invariant: total stock unchanged)
2. WHEN สินค้าถูกลบ, THE Database_Layer SHALL ลบ StockEntry ทั้งหมดที่อ้างอิง productId ของสินค้านั้น (Cascade Delete)
3. THE Database_Layer SHALL ไม่อนุญาตให้ quantity ของ StockEntry มีค่าต่ำกว่า 0
4. FOR ALL TransactionLog entries, THE Database_Layer SHALL บันทึก timestamp ที่ถูกต้องตามเวลาที่ทำรายการจริง
