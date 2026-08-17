# แผนการพัฒนา: ระบบจัดการคลังสินค้า (WMS Only)

## ภาพรวม

> **ขอบเขตที่ปรับลด:** แผนนี้ครอบคลุมเฉพาะโมดูล WMS เท่านั้น (Inbound, Putaway, Inventory, Outbound) ไม่รวม TMS, Billing, Dashboard, Master Data และ Integration modules

แผนการพัฒนาครอบคลุมโมดูลคลังสินค้าหลัก 4 โมดูล ตั้งแต่โครงสร้างพื้นฐาน ไปจนถึงการเชื่อมต่อภายในระบบ WMS โดยใช้ React Native + TypeScript, Zustand, WatermelonDB และ fast-check สำหรับ property-based testing

## Tasks

- [ ] 1. ตั้งค่าโครงสร้างโปรเจกต์และ Shared Infrastructure
  - [x] 1.1 สร้างโครงสร้างโฟลเดอร์ตาม Module Architecture
    - สร้าง `src/` พร้อม subdirectories: `app/`, `modules/`, `shared/`, `infrastructure/`, `store/`
    - สร้างโฟลเดอร์ module WMS: `inbound/`, `putaway/`, `inventory/`, `outbound/`
    - แต่ละ module มีโฟลเดอร์ย่อย: `screens/`, `components/`, `useCases/`, `repositories/`, `types.ts`
    - _Requirements: ทุกข้อ (โครงสร้างพื้นฐาน)_

  - [x] 1.2 ติดตั้ง dependencies และ configure เครื่องมือ
    - ติดตั้ง zustand, @nozbe/watermelondb, axios, react-navigation, react-native-camera, fast-check
    - Configure WatermelonDB schema เบื้องต้น
    - Configure Axios instance พร้อม interceptor สำหรับ retry/queue
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 1.3 สร้าง Shared Types และ Domain Models
    - สร้าง `src/shared/types/` รวม global types ทั้งหมด: `SyncStatus`, `DateRange`, `PaginatedResult<T>`
    - สร้าง `AppError` types และ error handling utilities
    - สร้าง `src/shared/constants/` สำหรับ config ค่าคงที่
    - _Requirements: 13.1, 13.2_

  - [x] 1.4 สร้าง Sync Engine และ Offline Queue
    - implement `SyncEngine` interface: `enqueue()`, `processQueue()`, `getQueueStatus()`, `resolveConflict()`
    - implement `OfflineQueue` interface: `add()`, `peek()`, `process()`, `getCount()`
    - implement exponential backoff retry strategy
    - implement conflict resolution strategy (server_wins สำหรับ master data, client_wins สำหรับ in-progress work)
    - _Requirements: 13.2_

  - [ ]* 1.5 เขียน property test สำหรับ Offline Queue
    - **Property: Failed Sync เข้าคิวและ Retry**
    - **Property: Offline Round-trip**
    - **Validates: Requirements 13.2**

  - [x] 1.6 สร้าง Auth Service และ RBAC
    - implement `AuthService` interface: `login()`, `checkPermission()`, `getSessionTimeout()`, `lockScreen()`, `getAuditLog()`
    - กำหนด Role types: `'admin' | 'warehouse_manager' | 'picker' | 'viewer'`
    - implement permission matrix สำหรับแต่ละ role
    - implement session timeout logic (15 นาที)
    - implement audit log recording
    - _Requirements: 13.4, 13.5, 13.6_

  - [ ]* 1.7 เขียน property tests สำหรับ Auth & RBAC
    - **Property: RBAC Access Control**
    - **Property: Session Timeout**
    - **Property: Audit Log สำหรับ Critical Actions**
    - **Validates: Requirements 13.4, 13.5, 13.6**

- [ ] 2. Checkpoint - ตรวจสอบ Infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. พัฒนา Inbound Module (การรับสินค้าเข้า)
  - [x] 3.1 สร้าง Data Models และ Types สำหรับ Inbound
    - implement interfaces: `GRN`, `GRNItem`, `DamageReport`, `ScannedItemResult`, `POComparisonResult`
    - สร้าง WatermelonDB models สำหรับ GRN และ GRNItem
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 implement Inbound Use Cases
    - implement `scanBarcode(code: string)`: ค้นหาข้อมูลสินค้าจากบาร์โค้ดและเปรียบเทียบกับ PO
    - implement `compareWithPO(items, poId)`: ตรวจสอบจำนวนสินค้ากับ PO และตรวจจับ discrepancy
    - implement `confirmReceiving(grn)`: สร้าง GRN พร้อมวันที่ เวลา และเปลี่ยนสถานะเป็น confirmed
    - implement `recordDamage(item, damage)`: บันทึกสินค้าเสียหายพร้อมรูปถ่ายและเหตุผล
    - implement `generateLabel(grn)`: สร้างบาร์โค้ด/QR Code สำหรับพิมพ์ฉลาก
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.3 เขียน property tests สำหรับ Inbound Module
    - **Property 1: การค้นหาสินค้าจากบาร์โค้ดตรงกับ PO**
    - **Property 2: GRN ที่สร้างต้องมีข้อมูลครบถ้วน**
    - **Property 3: สินค้าเสียหายต้องมีรายงานแยก**
    - **Property 5: Label round-trip**
    - **Property 6: การตรวจจับส่วนต่างระหว่างสินค้ารับเข้ากับ PO**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6**

  - [ ]* 3.4 เขียน property test สำหรับ GRN Filter
    - **Property 4: การกรอง GRN คืนผลลัพธ์ที่ตรงเงื่อนไข**
    - **Validates: Requirements 1.4**

  - [x] 3.5 สร้าง Inbound Repository และ API Service
    - implement InboundRepository: CRUD operations สำหรับ GRN
    - implement GRN filtering ด้วยวันที่, ผู้จัดจำหน่าย, สถานะ
    - เชื่อมต่อกับ WatermelonDB สำหรับ offline support
    - _Requirements: 1.4_

  - [x] 3.6 สร้าง Inbound Screens และ UI Components
    - สร้างหน้าจอสแกนบาร์โค้ด/QR Code พร้อมแสดงรายละเอียดสินค้า
    - สร้างหน้าจอยืนยันรับสินค้าและบันทึกความเสียหาย
    - สร้างหน้าจอประวัติ GRN พร้อมตัวกรอง
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. พัฒนา Putaway Engine (แนะนำตำแหน่งจัดเก็บ)
  - [x] 4.1 สร้าง Data Models สำหรับ Putaway
    - implement interfaces: `Bin`, `BinSuggestion`, `ReceivedItem`
    - implement `PutawayRules`: `isFastMoving()`, `requiresTemperatureControl()`, `getBinPriority()`
    - สร้าง WatermelonDB models สำหรับ Bin
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 implement Putaway Use Cases และ Bin Scoring Algorithm
    - implement `calculateBinScore(bin, sku)`: คำนวณคะแนนตามประเภทสินค้า, อุณหภูมิ, ระยะทาง, ความจุ
    - implement `suggestBin(item)`: แนะนำตำแหน่ง Bin ที่เหมาะสม
    - implement `confirmPutaway(itemId, binId)`: ยืนยันและอัปเดตตำแหน่ง
    - implement `getSuggestedAlternatives(binId, item)`: แนะนำตำแหน่งสำรอง
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.3 เขียน property tests สำหรับ Putaway Engine
    - **Property 7: Putaway แนะนำ Bin ที่เหมาะกับประเภทสินค้า**
    - **Property 8: สินค้า Fast-moving ได้ตำแหน่งใกล้ประตู**
    - **Property 9: สินค้าควบคุมอุณหภูมิต้องอยู่ในโซนที่เหมาะสม**
    - **Property 10: Putaway ยืนยันแล้วอัปเดตตำแหน่ง**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 4.4 สร้าง Putaway Screens
    - สร้างหน้าจอแนะนำตำแหน่งจัดเก็บพร้อมแสดง score และเหตุผล
    - สร้างหน้าจอยืนยันการจัดเก็บ
    - _Requirements: 2.1, 2.4, 2.5_

- [ ] 5. พัฒนา Inventory Module (การจัดการสต็อก)
  - [x] 5.1 สร้าง Data Models สำหรับ Inventory
    - implement interfaces: `StockLevel`, `StockTransfer`, `CycleCount`, `CycleCountItem`, `AlertResult`
    - implement `StockAlertRules`: `checkMinThreshold()`, `checkMaxThreshold()`
    - สร้าง WatermelonDB models
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 implement Inventory Use Cases
    - implement `getStockLevel(skuId)` และ `getAllStockLevels(filters)`: แสดงสต็อกเรียลไทม์
    - implement `transferStock(transfer)`: ย้ายสต็อกพร้อมบันทึกประวัติ
    - implement `createCycleCount(params)`: สร้างรายการนับสต็อกตามกลุ่ม
    - implement `recordCountResult(countId, results)`: บันทึกผลนับและคำนวณส่วนต่าง
    - implement `approveAdjustment(countId, approvedBy)`: อนุมัติการปรับปรุงสต็อก
    - implement threshold alert logic: ตรวจสอบ min/max และสร้าง push notification
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.3 เขียน property tests สำหรับ Inventory Module
    - **Property 11: สต็อกสะท้อนการดำเนินงานทั้งหมด**
    - **Property 12: การแจ้งเตือน Threshold ของสต็อก**
    - **Property 13: การย้ายสต็อกบันทึกครบทุกฟิลด์**
    - **Property 14: Cycle Count สร้างรายการตรงกับกลุ่มที่กำหนด**
    - **Property 15: ส่วนต่างจากการนับสต็อก**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 5.4 สร้าง Inventory Screens
    - สร้างหน้าจอแสดงสต็อกเรียลไทม์พร้อมตัวกรอง
    - สร้างหน้าจอย้ายสต็อก
    - สร้างหน้าจอ Cycle Count พร้อมบันทึกผลนับ
    - _Requirements: 3.1, 3.4, 3.5_

- [x] 7. Checkpoint - ตรวจสอบ WMS Modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. เชื่อมต่อโมดูล WMS และ Navigation Setup
  - [x] 8.1 สร้าง App Navigation Structure สำหรับ WMS
    - configure React Navigation v6 พร้อม tab navigator และ stack navigators
    - กำหนด navigation routes สำหรับ WMS modules (Inbound, Putaway, Inventory)
    - _Requirements: 1.1-3.6_

  - [x] 8.2 สร้าง Zustand Stores สำหรับ WMS
    - สร้าง stores: authStore, inboundStore, putawayStore, inventoryStore
    - เชื่อมต่อ stores กับ WatermelonDB สำหรับ persistence
    - _Requirements: 13.1, 13.2_

  - [x] 8.3 เชื่อมต่อ Cross-Module Flows ภายใน WMS
    - Inbound → Putaway → Inventory flow
    - สถานะเปลี่ยน → Push Notification flow (stock alerts)
    - _Requirements: 1.1-3.6, 3.2, 3.3_

- [x] 9. Final Checkpoint - ตรวจสอบระบบ WMS ทั้งหมด
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks ที่มีเครื่องหมาย `*` เป็น optional สามารถข้ามได้สำหรับ MVP ที่ต้องการเร็ว
- ทุก task อ้างอิง requirements เพื่อให้สามารถ trace ได้
- Checkpoints ช่วยตรวจสอบความถูกต้องเป็นระยะ
- Property tests ใช้ fast-check library ตรวจสอบ Properties 1-21 ของ WMS
- ระบบออกแบบเป็น offline-first โดยข้อมูลจะ sync เมื่อกลับมาออนไลน์
- ขอบเขตนี้ไม่รวม TMS (Fleet, Route, Dispatch, Tracking/POD), Billing, Dashboard, Master Data และ Integration modules
