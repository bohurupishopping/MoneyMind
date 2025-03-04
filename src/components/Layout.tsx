import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../contexts/BusinessContext';
import { 
  Home, 
  Users, 
  ShoppingBag, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown,
  Building2,
  Settings,
  DollarSign,
  CreditCard as BankIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Bot
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type SidebarLinkProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: string | number;
};

const SidebarLink = ({ to, icon, label, isActive, badge }: SidebarLinkProps) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 text-sm ${
      isActive
        ? 'bg-indigo-700 text-white'
        : 'text-gray-300 hover:bg-indigo-800 hover:text-white'
    } rounded-md transition-colors duration-200`}
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
    {badge && (
      <span className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-full">
        {badge}
      </span>
    )}
  </Link>
);

type SidebarSubmenuProps = {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
  badge?: string | number;
};

const SidebarSubmenu = ({ icon, label, isActive, children, badge }: SidebarSubmenuProps) => {
  const [isOpen, setIsOpen] = React.useState(isActive);
  
  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm ${
          isActive
            ? 'bg-indigo-700 text-white'
            : 'text-gray-300 hover:bg-indigo-800 hover:text-white'
        } rounded-md transition-colors duration-200`}
      >
        <div className="flex items-center">
          <span className="mr-3">{icon}</span>
          <span>{label}</span>
          {badge && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 pl-6 border-l border-indigo-800">
          {children}
        </div>
      )}
    </div>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { selectedBusiness, businesses, selectBusiness } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = React.useState(false);
  const [pendingBills, setPendingBills] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBusinessChange = (businessId: string) => {
    selectBusiness(businessId);
    setBusinessDropdownOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Fetch pending counts for badges
  useEffect(() => {
    if (selectedBusiness) {
      fetchPendingCounts();
    }
  }, [selectedBusiness]);

  const fetchPendingCounts = async () => {
    if (!selectedBusiness) return;
    
    try {
      // Pending bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'PENDING');
        
      if (billsError) throw billsError;
      
      // Pending invoices  
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'PENDING');
    
      if (invoicesError) throw invoicesError;
      
      setPendingBills(billsData?.length || 0);
      setPendingInvoices(invoicesData?.length || 0);
    } catch (err) {
      console.error('Error fetching pending counts:', err);
      // Set to 0 on error to avoid undefined values
      setPendingBills(0);
      setPendingInvoices(0);
    }
  };

  const isContactsActive = location.pathname.startsWith('/contacts');
  const isTransactionsActive = location.pathname.startsWith('/receipts') || location.pathname.startsWith('/payments');
  const isInvoicesActive = location.pathname.startsWith('/invoices') || location.pathname.startsWith('/bills');
  const isBankingActive = location.pathname.startsWith('/banking');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="fixed z-20 top-4 right-4 md:hidden">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md bg-indigo-600 text-white focus:outline-none"
        >
          {sidebarOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative z-10 transform md:translate-x-0 transition-transform duration-300 ease-in-out md:w-64 w-72 h-full bg-indigo-900 text-white`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and business selector */}
          <div className="p-4 border-b border-indigo-800">
            <h1 className="text-xl font-bold mb-4">AccuBooks</h1>
            
            {/* Business selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 bg-indigo-800 rounded-md text-sm focus:outline-none"
              >
                <div className="flex items-center overflow-hidden">
                  <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{selectedBusiness?.name || 'Select Business'}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              
              {businessDropdownOpen && (
                <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-50">
                  <ul className="py-1 max-h-60 overflow-y-auto">
                    {businesses.map(business => (
                      <li key={business.id}>
                        <button
                          onClick={() => handleBusinessChange(business.id)}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            selectedBusiness?.id === business.id ? 'bg-gray-100 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {business.name}
                        </button>
                      </li>
                    ))}
                    <li className="border-t border-gray-200">
                      <button
                        onClick={() => {
                          setBusinessDropdownOpen(false);
                          navigate('/businesses/new');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
                      >
                        + Add New Business
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
            <SidebarLink 
              to="/dashboard" 
              icon={<Home size={18} />} 
              label="Dashboard" 
              isActive={location.pathname === '/dashboard'} 
            />
            
            {/* Add TallyAI Link */}
            <SidebarLink 
              to="/tally-ai" 
              icon={<Bot size={18} />} 
              label="TallyAI Chat" 
              isActive={location.pathname.startsWith('/tally-ai')} 
            />
            
            {/* Transactions - Payments & Receipts */}
            <SidebarSubmenu
              icon={<DollarSign size={18} />}
              label="Transactions"
              isActive={isTransactionsActive}
              badge={pendingInvoices > 0 ? pendingInvoices : undefined}
            >
              <Link
                to="/receipts"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/receipts')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <ArrowDownLeft className="h-4 w-4 mr-2 text-green-400" />
                  Receipts
                </div>
              </Link>
              <Link
                to="/payments"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/payments')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-2 text-red-400" />
                  Payments
                  {pendingBills > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {pendingBills}
                    </span>
                  )}
                </div>
              </Link>
            </SidebarSubmenu>
            
            <SidebarSubmenu
              icon={<Users size={18} />}
              label="Contacts"
              isActive={isContactsActive}
            >
              <Link
                to="/contacts/debtors"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/contacts/debtors')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Debtors
              </Link>
              <Link
                to="/contacts/creditors"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/contacts/creditors')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Creditors
              </Link>
            </SidebarSubmenu>
            
            <SidebarLink 
              to="/purchases" 
              icon={<ShoppingBag size={18} />} 
              label="Purchases" 
              isActive={location.pathname.startsWith('/purchases')} 
            />
            
            <SidebarSubmenu
              icon={<FileText size={18} />}
              label="Invoices & Bills"
              isActive={isInvoicesActive}
              badge={pendingBills > 0 ? pendingBills : undefined}
            >
              <Link
                to="/invoices"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/invoices')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Invoices
                {pendingInvoices > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {pendingInvoices}
                  </span>
                )}
              </Link>
              <Link
                to="/bills"
                className={`block py-2 text-sm ${
                  location.pathname.startsWith('/bills')
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Bills
                {pendingBills > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {pendingBills}
                  </span>
                )}
              </Link>
            </SidebarSubmenu>

            {/* Banking & Cash Management */}
            <SidebarSubmenu
              icon={<BankIcon size={18} />}
              label="Banking & Cash"
              isActive={isBankingActive}
            >
              <Link
                to="/banking/accounts"
                className={`block py-2 text-sm ${
                  location.pathname === '/banking/accounts'
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Accounts
              </Link>
              <Link
                to="/banking/transactions"
                className={`block py-2 text-sm ${
                  location.pathname === '/banking/transactions'
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Transactions
              </Link>
              <Link
                to="/banking/reconcile"
                className={`block py-2 text-sm ${
                  location.pathname === '/banking/reconcile'
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Reconciliation
              </Link>
            </SidebarSubmenu>
            
            {selectedBusiness && (
              <SidebarLink
                to={`/businesses/edit/${selectedBusiness.id}`}
                icon={<Settings size={18} />}
                label="Business Settings"
                isActive={location.pathname === `/businesses/edit/${selectedBusiness.id}`}
              />
            )}
          </nav>

          {/* Sign out button */}
          <div className="p-4 border-t border-indigo-800">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-indigo-800 rounded-md transition-colors duration-200"
            >
              <LogOut size={18} className="mr-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-grow overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}