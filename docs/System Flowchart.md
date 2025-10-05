graph TB
    Start([System Start]) --> Login[User Login]
    
    Login --> AuthCheck{Authentication<br/>Valid?}
    AuthCheck -->|No| LoginFail[Show Error Message]
    LoginFail --> Login
    AuthCheck -->|Yes| RoleCheck{Check User Role}
    
    RoleCheck -->|Admin| AdminDash[Admin Dashboard]
    RoleCheck -->|Manager| ManagerDash[Manager Dashboard]
    RoleCheck -->|Cashier| CashierDash[Cashier/POS Dashboard]
    
    %% ADMIN FLOW
    AdminDash --> AdminActions{Select Action}
    AdminActions -->|User Management| UserMgmt[Manage Users<br/>Create/Edit/Deactivate]
    AdminActions -->|System Settings| SysSettings[Configure System<br/>Tax/Discount Rules/Alerts]
    AdminActions -->|Full Reports| AdminReports[Access All Reports<br/>& Analytics]
    AdminActions -->|Inventory Admin| InvAdmin[Inventory Adjustments<br/>& Override]
    
    UserMgmt --> AdminDash
    SysSettings --> AdminDash
    AdminReports --> AdminDash
    InvAdmin --> AdminDash
    
    %% MANAGER FLOW
    ManagerDash --> MgrActions{Select Action}
    MgrActions -->|View Reports| MgrReports[Sales Reports<br/>Inventory Reports<br/>Customer Analytics]
    MgrActions -->|Product Management| ProductMgmt[Add/Edit Products<br/>Manage Categories<br/>Set Pricing]
    MgrActions -->|Package Management| PackageMgmt[Create/Edit Packages<br/>Set VIP Offerings]
    MgrActions -->|Supplier Management| SupplierMgmt[Manage Suppliers<br/>Purchase Orders]
    MgrActions -->|Inventory Review| InvReview[Stock Levels<br/>Low Stock Alerts<br/>Movement History]
    
    MgrReports --> ManagerDash
    ProductMgmt --> SaveProduct[Save Product Data]
    SaveProduct --> UpdateDB1[(Update Database)]
    UpdateDB1 --> ManagerDash
    
    PackageMgmt --> DefinePackage[Define Package Items<br/>& Pricing]
    DefinePackage --> UpdateDB2[(Update Database)]
    UpdateDB2 --> ManagerDash
    
    SupplierMgmt --> POProcess[Create Purchase Order]
    POProcess --> UpdateDB3[(Update Database)]
    UpdateDB3 --> ManagerDash
    
    InvReview --> ManagerDash
    
    %% CASHIER/POS MAIN FLOW
    CashierDash --> POSActions{POS Actions}
    POSActions -->|New Order| NewOrder[Start New Order]
    POSActions -->|View Orders| ViewOrders[View Pending/Held Orders]
    POSActions -->|Inventory Check| QuickInvCheck[Quick Stock Check]
    
    ViewOrders --> SelectOrder[Select Order to Resume]
    SelectOrder --> BuildOrder
    QuickInvCheck --> CashierDash
    
    %% ORDER BUILDING FLOW
    NewOrder --> TableSelect{Assign Table?}
    TableSelect -->|Yes| SelectTable[Select Table from Grid]
    TableSelect -->|No| CustomerSearch
    SelectTable --> UpdateTableStatus[Update Table Status to Occupied]
    UpdateTableStatus --> CustomerSearch{Search Customer?}
    CustomerSearch -->|Yes| SearchCust[Search by Name/Phone/<br/>Customer ID]
    CustomerSearch -->|No| AnonymousOrder[Proceed as<br/>Walk-in/Anonymous]
    
    SearchCust --> CustFound{Customer<br/>Found?}
    CustFound -->|No| NewCustReg[Quick Customer<br/>Registration]
    CustFound -->|Yes| SelectCust[Select Customer]
    NewCustReg --> SelectCust
    
    SelectCust --> CheckVIP{VIP<br/>Customer?}
    CheckVIP -->|Yes| CheckEventOffer{Active Event<br/>Offer?}
    CheckVIP -->|No| RegMode[Regular Pricing Mode]
    
    CheckEventOffer -->|Yes| ShowEventOffer[Display Birthday/<br/>Anniversary Badge<br/>Show Available Offer]
    CheckEventOffer -->|No| VIPMode
    ShowEventOffer --> VIPMode[Enable VIP Pricing<br/>Show VIP Packages]
    
    VIPMode --> BuildOrder[Build Order]
    RegMode --> BuildOrder
    AnonymousOrder --> BuildOrder
    
    %% ORDER BUILDING DETAILS
    BuildOrder --> OrderType{Order Type}
    OrderType -->|Regular Products| SelectProduct[Select Product<br/>from Categories]
    OrderType -->|VIP Package| SelectPackage[Select VIP Package]
    
    SelectProduct --> ProductType{Product Type}
    ProductType -->|Beverage| AddBeverage[Add to Order<br/>Select Size/Variant]
    ProductType -->|Pulutan/Food| FoodAddons[Add to Order<br/>Select Add-ons]
    
    AddBeverage --> UpdateOrderSummary[Update Order Summary<br/>Calculate Subtotal]
    
    FoodAddons --> AddonModal{Add-ons<br/>Available?}
    AddonModal -->|Yes| SelectAddons[Show Add-on Modal<br/>Select Options]
    AddonModal -->|No| AddToOrder[Add to Order]
    SelectAddons --> AddToOrder
    AddToOrder --> UpdateOrderSummary
    
    SelectPackage --> PackageType{Package Type}
    PackageType -->|Fixed Items| AddPackageFixed[Add Package<br/>All Items Included]
    PackageType -->|Choice Items| ChoiceModal[Show Choice Modal<br/>Select Options]
    
    ChoiceModal --> ValidateChoice{Valid<br/>Selections?}
    ValidateChoice -->|No| ChoiceModal
    ValidateChoice -->|Yes| AddPackageFixed
    AddPackageFixed --> UpdateOrderSummary
    
    UpdateOrderSummary --> CheckHappyHour{Happy Hour<br/>Active?}
    CheckHappyHour -->|Yes| ApplyHappyHour[Apply Happy Hour Pricing]
    CheckHappyHour -->|No| CheckStock
    ApplyHappyHour --> CheckStock{Check Inventory<br/>Available?}
    CheckStock -->|No| StockAlert[Show Low/Out of<br/>Stock Alert]
    StockAlert --> BuildOrder
    CheckStock -->|Yes| OrderContinue{Continue<br/>Building?}
    
    OrderContinue -->|Add More Items| BuildOrder
    OrderContinue -->|Modify Quantity| ModifyQty[Adjust Item Quantity]
    OrderContinue -->|Remove Item| RemoveItem[Remove from Order]
    OrderContinue -->|Add Notes| AddNotes[Add Special Instructions]
    OrderContinue -->|Hold Order| HoldOrder[Save as Pending<br/>Return to Dashboard]
    OrderContinue -->|Process Payment| PaymentFlow[Proceed to Payment]
    
    ModifyQty --> UpdateOrderSummary
    RemoveItem --> UpdateOrderSummary
    AddNotes --> UpdateOrderSummary
    HoldOrder --> UpdateDB4[(Save Order<br/>Status: On Hold)]
    UpdateDB4 --> CashierDash
    
    %% PAYMENT FLOW
    PaymentFlow --> DisplayTotal[Display Order Total<br/>Show Breakdown]
    DisplayTotal --> ApplyDiscount{Apply<br/>Discount?}
    
    ApplyDiscount -->|Yes| DiscountType{Discount Type}
    DiscountType -->|Line Item| LineDiscount[Apply to Specific Item]
    DiscountType -->|Order Level| OrderDiscount[Apply to Total]
    DiscountType -->|Complimentary| CompItem[Mark as Complimentary]
    
    LineDiscount --> DiscountAuth{Requires<br/>Manager<br/>Approval?}
    OrderDiscount --> DiscountAuth
    CompItem --> DiscountAuth
    
    DiscountAuth -->|Yes >20%| MgrPIN[Enter Manager PIN<br/>Enter Reason]
    DiscountAuth -->|No| ApplyDiscAmount[Apply Discount Amount]
    MgrPIN --> ValidateMgr{Manager<br/>Valid?}
    ValidateMgr -->|No| MgrPIN
    ValidateMgr -->|Yes| LogDiscount[Log Discount<br/>Cashier + Manager IDs]
    LogDiscount --> ApplyDiscAmount
    
    ApplyDiscAmount --> RecalcTotal[Recalculate Total]
    ApplyDiscount -->|No| SelectPayment[Select Payment Method]
    RecalcTotal --> SelectPayment
    
    SelectPayment --> PaymentMethod{Payment<br/>Method}
    PaymentMethod -->|Cash| CashPayment[Enter Amount Tendered]
    PaymentMethod -->|Card| CardPayment[Enter Last 4 Digits]
    PaymentMethod -->|E-Wallet| EwalletPayment[Enter Reference Number]
    PaymentMethod -->|Bank Transfer| BankPayment[Enter Bank & Reference]
    PaymentMethod -->|Split Payment| SplitPayment[Multiple Payment Methods]
    
    CashPayment --> ValidateCash{Amount >=<br/>Total?}
    ValidateCash -->|No| CashPayment
    ValidateCash -->|Yes| CalcChange[Calculate Change]
    CalcChange --> ConfirmPayment
    
    CardPayment --> ConfirmPayment[Confirm Payment]
    EwalletPayment --> ConfirmPayment
    BankPayment --> ConfirmPayment
    
    SplitPayment --> SplitEntry[Enter Each Payment<br/>Method & Amount]
    SplitEntry --> ValidateSplit{Total Matches<br/>Order Amount?}
    ValidateSplit -->|No| SplitEntry
    ValidateSplit -->|Yes| ConfirmPayment
    
    ConfirmPayment --> LargeTransaction{Amount ><br/>₱5,000?}
    LargeTransaction -->|Yes| ConfirmDialog[Show Confirmation<br/>Dialog]
    ConfirmDialog --> ProcessPayment[Process Payment]
    LargeTransaction -->|No| ProcessPayment
    
    %% POST-PAYMENT PROCESSING
    ProcessPayment --> UpdateOrderStatus[Update Order Status<br/>to 'Completed']
    UpdateOrderStatus --> GenerateOrderNum[Generate Order Number<br/>& Timestamp]
    GenerateOrderNum --> DeductInventory[Automatic Inventory<br/>Deduction]
    
    DeductInventory --> LogInventory[Log Inventory Movement<br/>Type: Sale<br/>Link to Order ID]
    LogInventory --> UpdateCustomer[Update Customer Stats<br/>Total Spent<br/>Visit Count<br/>Loyalty Points]
    
    UpdateCustomer --> CheckLowStock{Any Products<br/>Below Reorder<br/>Point?}
    CheckLowStock -->|Yes| TriggerAlert[Trigger Low Stock Alert<br/>Notify Manager]
    CheckLowStock -->|No| GenerateReceipt
    TriggerAlert --> GenerateReceipt[Generate Receipt]
    
    GenerateReceipt --> PrintReceipt[Print Receipt<br/>Customer Copy]
    PrintReceipt --> RouteOrders[Route Order Items<br/>to Kitchen/Bartender]
    
    RouteOrders --> AnalyzeItems{Analyze Each<br/>Order Item}
    AnalyzeItems -->|Food Item| SendToKitchen[Send to Kitchen Display<br/>Status: Pending]
    AnalyzeItems -->|Beverage| SendToBartender[Send to Bartender Display<br/>Status: Pending]
    AnalyzeItems -->|Both| SendToBoth[Send to Both Stations]
    
    SendToKitchen --> SaveTransaction
    SendToBartender --> SaveTransaction
    SendToBoth --> SaveTransaction[(Save Complete<br/>Transaction to DB)]
    
    SaveTransaction --> AuditLog[Create Audit Log Entry<br/>User/Time/Action]
    AuditLog --> UpdateTableAfterPayment{Table<br/>Assigned?}
    UpdateTableAfterPayment -->|Yes| SetTableAvailable[Set Table Status<br/>to Available]
    UpdateTableAfterPayment -->|No| TransactionComplete
    SetTableAvailable --> TransactionComplete[Transaction Complete]
    TransactionComplete --> CashierDash
    
    %% VOID/CANCEL FLOW
    ViewOrders --> VoidOption{Void<br/>Transaction?}
    VoidOption -->|Yes| VoidAuth[Require Manager<br/>Authorization]
    VoidAuth --> VoidReason[Enter Void Reason]
    VoidReason --> ReturnInventory[Return Inventory<br/>to Stock]
    ReturnInventory --> UpdateVoidStatus[Update Order Status<br/>to 'Voided']
    UpdateVoidStatus --> LogVoid[Log Void Transaction<br/>Audit Trail]
    LogVoid --> CashierDash
    
    %% INVENTORY MANAGEMENT FLOW
    InvAdmin --> InvAction{Inventory<br/>Action}
    InvReview --> InvAction
    
    InvAction -->|Stock In| ReceiveShipment[Receive Shipment<br/>Enter PO Reference]
    InvAction -->|Stock Out| RecordWaste[Record Waste/Loss<br/>Select Reason]
    InvAction -->|Physical Count| PhysicalCount[Conduct Physical Count<br/>Enter Actual Quantity]
    InvAction -->|Transfer| StockTransfer[Transfer Between<br/>Locations]
    
    ReceiveShipment --> EnterQty[Enter Received Quantity<br/>Unit Cost]
    RecordWaste --> EnterQty
    PhysicalCount --> CalcVariance[Calculate Variance<br/>Actual vs System]
    StockTransfer --> EnterQty
    
    EnterQty --> LargeAdj{Adjustment<br/>>10% of<br/>Stock?}
    CalcVariance --> LargeAdj
    
    LargeAdj -->|Yes| MgrApproval[Require Manager<br/>Approval]
    LargeAdj -->|No| UpdateInventory[Update Inventory<br/>Quantities]
    MgrApproval --> UpdateInventory
    
    UpdateInventory --> CreateMovement[Create Inventory<br/>Movement Record]
    CreateMovement --> UpdateDB5[(Update Database<br/>Log Audit Trail)]
    UpdateDB5 --> AdminDash
    UpdateDB5 --> ManagerDash
    
    %% REPORTING FLOW
    MgrReports --> ReportType{Report Type}
    AdminReports --> ReportType
    
    ReportType -->|Daily Sales| DailySales[Daily Sales Summary<br/>Revenue/Transactions<br/>Payment Breakdown]
    ReportType -->|Product Performance| ProductPerf[Top Sellers<br/>Slow Movers<br/>Profitability]
    ReportType -->|Financial| FinancialRpt[Revenue Report<br/>P&L Statement<br/>Cash Flow]
    ReportType -->|Customer Analytics| CustomerRpt[CLV Analysis<br/>VIP Performance<br/>Segmentation]
    ReportType -->|Inventory| InventoryRpt[Stock Levels<br/>Movement History<br/>Turnover Rate]
    
    DailySales --> ExportReport{Export<br/>Report?}
    ProductPerf --> ExportReport
    FinancialRpt --> ExportReport
    CustomerRpt --> ExportReport
    InventoryRpt --> ExportReport
    
    ExportReport -->|PDF| GeneratePDF[Generate PDF<br/>Print/Email]
    ExportReport -->|Excel| GenerateExcel[Generate Excel<br/>Download]
    ExportReport -->|View Only| DisplayReport[Display in Dashboard]
    
    GeneratePDF --> ManagerDash
    GeneratePDF --> AdminDash
    GenerateExcel --> ManagerDash
    GenerateExcel --> AdminDash
    DisplayReport --> ManagerDash
    DisplayReport --> AdminDash
    
    %% SYSTEM MONITORING
    AdminDash --> SystemHealth{System<br/>Monitoring}
    SystemHealth --> CheckAlerts[Check Low Stock Alerts<br/>System Errors<br/>User Activity]
    CheckAlerts --> AdminDash
    
    style Start fill:#4CAF50,color:#fff
    style TransactionComplete fill:#4CAF50,color:#fff
    style SaveTransaction fill:#2196F3,color:#fff
    style UpdateDB1 fill:#2196F3,color:#fff
    style UpdateDB2 fill:#2196F3,color:#fff
    style UpdateDB3 fill:#2196F3,color:#fff
    style UpdateDB4 fill:#2196F3,color:#fff
    style UpdateDB5 fill:#2196F3,color:#fff
    style StockAlert fill:#FF9800,color:#fff
    style MgrPIN fill:#FF9800,color:#fff
    style VoidAuth fill:#F44336,color:#fff
    style CheckVIP fill:#9C27B0,color:#fff
    style VIPMode fill:#9C27B0,color:#fff
    style CheckEventOffer fill:#FF6F00,color:#fff
    style ShowEventOffer fill:#FF6F00,color:#fff
    style CheckHappyHour fill:#00BCD4,color:#fff
    style ApplyHappyHour fill:#00BCD4,color:#fff
    style SendToKitchen fill:#4CAF50,color:#fff
    style SendToBartender fill:#2196F3,color:#fff
    style SendToBoth fill:#9C27B0,color:#fff
    style TableSelect fill:#FFC107,color:#000
    style SelectTable fill:#FFC107,color:#000
