import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { useEffect } from 'react';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';

// Business Pages
import { NewBusinessPage } from './pages/business/NewBusinessPage';
import { EditBusinessPage } from './pages/business/EditBusinessPage';

// Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Debtors & Creditors
import { DebtorsPage } from './pages/contacts/DebtorsPage';
import { CreditorsPage } from './pages/contacts/CreditorsPage';
import { DebtorDetailPage } from './pages/contacts/DebtorDetailPage';
import { CreditorDetailPage } from './pages/contacts/CreditorDetailPage';
import { NewDebtorPage } from './pages/contacts/NewDebtorPage';
import { NewCreditorPage } from './pages/contacts/NewCreditorPage';
import { EditDebtorPage } from './pages/contacts/EditDebtorPage';
import { EditCreditorPage } from './pages/contacts/EditCreditorPage';

// Payment Receipts
import { ReceiptsPage } from './pages/receipts/ReceiptsPage';
import { ReceiptDetailPage } from './pages/receipts/ReceiptDetailPage';
import { NewReceiptPage } from './pages/receipts/NewReceiptPage';
import { EditReceiptPage } from './pages/receipts/EditReceiptPage';

// Payments
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { PaymentDetailPage } from './pages/payments/PaymentDetailPage';
import { NewPaymentPage } from './pages/payments/NewPaymentPage';
import { EditPaymentPage } from './pages/payments/EditPaymentPage';

// Purchases
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { PurchaseDetailPage } from './pages/purchases/PurchaseDetailPage';
import { NewPurchasePage } from './pages/purchases/NewPurchasePage';
import { EditPurchasePage } from './pages/purchases/EditPurchasePage';

// Invoices & Bills
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { NewInvoicePage } from './pages/invoices/NewInvoicePage';
import { EditInvoicePage } from './pages/invoices/EditInvoicePage';
import { BillsPage } from './pages/invoices/BillsPage';
import { BillDetailPage } from './pages/invoices/BillDetailPage';
import { NewBillPage } from './pages/invoices/NewBillPage';
import { EditBillPage } from './pages/invoices/EditBillPage';

// Banking & Cash Management
import { BankAccountsPage } from './pages/banking/BankAccountsPage';
import { NewBankAccountPage } from './pages/banking/NewBankAccountPage';
import { EditBankAccountPage } from './pages/banking/EditBankAccountPage';
import { BankAccountDetailPage } from './pages/banking/BankAccountDetailPage';
import { TransactionsPage } from './pages/banking/TransactionsPage';
import { NewTransactionPage } from './pages/banking/NewTransactionPage';
import { EditTransactionPage } from './pages/banking/EditTransactionPage';
import { ReconciliationPage } from './pages/banking/ReconciliationPage';

// TallyAI
import { TallyAIChatPage } from './pages/tally-ai/TallyAIChatPage';
import { TallyAISettingsPage } from './pages/tally-ai/TallyAISettingsPage';

function App() {
  // Add this debugging code
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.visibilityState);
    };
    
    const handleFocus = () => {
      console.log('Window focused');
    };
    
    const handleBlur = () => {
      console.log('Window blurred');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/onboarding" 
              element={
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              } 
            />
            
            {/* Business Management Routes */}
            <Route 
              path="/businesses/new" 
              element={
                <RequireAuth>
                  <NewBusinessPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/businesses/edit/:id" 
              element={
                <RequireAuth>
                  <EditBusinessPage />
                </RequireAuth>
              } 
            />
            
            {/* Debtors & Creditors Routes */}
            <Route 
              path="/contacts/debtors" 
              element={
                <RequireAuth>
                  <DebtorsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/debtors/new" 
              element={
                <RequireAuth>
                  <NewDebtorPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/debtors/:id" 
              element={
                <RequireAuth>
                  <DebtorDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/debtors/edit/:id" 
              element={
                <RequireAuth>
                  <EditDebtorPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/creditors" 
              element={
                <RequireAuth>
                  <CreditorsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/creditors/new" 
              element={
                <RequireAuth>
                  <NewCreditorPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/creditors/:id" 
              element={
                <RequireAuth>
                  <CreditorDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/contacts/creditors/edit/:id" 
              element={
                <RequireAuth>
                  <EditCreditorPage />
                </RequireAuth>
              } 
            />
            
            {/* Payment Receipts Routes */}
            <Route 
              path="/receipts" 
              element={
                <RequireAuth>
                  <ReceiptsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/receipts/new" 
              element={
                <RequireAuth>
                  <NewReceiptPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/receipts/:id" 
              element={
                <RequireAuth>
                  <ReceiptDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/receipts/edit/:id" 
              element={
                <RequireAuth>
                  <EditReceiptPage />
                </RequireAuth>
              } 
            />
            
            {/* Payments Routes */}
            <Route 
              path="/payments" 
              element={
                <RequireAuth>
                  <PaymentsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/payments/new" 
              element={
                <RequireAuth>
                  <NewPaymentPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/payments/:id" 
              element={
                <RequireAuth>
                  <PaymentDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/payments/edit/:id" 
              element={
                <RequireAuth>
                  <EditPaymentPage />
                </RequireAuth>
              } 
            />
            
            {/* Purchases Routes */}
            <Route 
              path="/purchases" 
              element={
                <RequireAuth>
                  <PurchasesPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/purchases/new" 
              element={
                <RequireAuth>
                  <NewPurchasePage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/purchases/:id" 
              element={
                <RequireAuth>
                  <PurchaseDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/purchases/edit/:id" 
              element={
                <RequireAuth>
                  <EditPurchasePage />
                </RequireAuth>
              } 
            />
            
            {/* Invoices Routes */}
            <Route 
              path="/invoices" 
              element={
                <RequireAuth>
                  <InvoicesPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/invoices/new" 
              element={
                <RequireAuth>
                  <NewInvoicePage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/invoices/:id" 
              element={
                <RequireAuth>
                  <InvoiceDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/invoices/edit/:id" 
              element={
                <RequireAuth>
                  <EditInvoicePage />
                </RequireAuth>
              } 
            />
            
            {/* Bills Routes */}
            <Route 
              path="/bills" 
              element={
                <RequireAuth>
                  <BillsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/bills/new" 
              element={
                <RequireAuth>
                  <NewBillPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/bills/:id" 
              element={
                <RequireAuth>
                  <BillDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/bills/edit/:id" 
              element={
                <RequireAuth>
                  <EditBillPage />
                </RequireAuth>
              } 
            />

            {/* Banking & Cash Management Routes */}
            <Route 
              path="/banking" 
              element={
                <RequireAuth>
                  <Navigate to="/banking/accounts" replace />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/accounts" 
              element={
                <RequireAuth>
                  <BankAccountsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/accounts/new" 
              element={
                <RequireAuth>
                  <NewBankAccountPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/accounts/:id" 
              element={
                <RequireAuth>
                  <BankAccountDetailPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/accounts/edit/:id" 
              element={
                <RequireAuth>
                  <EditBankAccountPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/transactions" 
              element={
                <RequireAuth>
                  <TransactionsPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/transactions/new" 
              element={
                <RequireAuth>
                  <NewTransactionPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/transactions/edit/:id" 
              element={
                <RequireAuth>
                  <EditTransactionPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/banking/reconcile" 
              element={
                <RequireAuth>
                  <ReconciliationPage />
                </RequireAuth>
              } 
            />
            
            {/* TallyAI Routes */}
            <Route 
              path="/tally-ai" 
              element={
                <RequireAuth>
                  <TallyAIChatPage />
                </RequireAuth>
              } 
            />
            <Route 
              path="/tally-ai/settings" 
              element={
                <RequireAuth>
                  <TallyAISettingsPage />
                </RequireAuth>
              } 
            />
            
            {/* Redirect root to dashboard or login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;