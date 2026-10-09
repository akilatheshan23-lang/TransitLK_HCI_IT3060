import React from 'react';

export type ScreenType =
  | 'home'
  | 'transit'
  | 'login'
  | 'register'
  | 'authority-login'
  | 'bus-owner-login'
  | 'dashboard'
  | 'fleet'
  | 'payment'
  | 'tickets'
  | 'conductor';

export const AppNavigationContext = React.createContext<{
  navigateToScreen: (screen: ScreenType) => void;
}>({
  navigateToScreen: () => {},
});

export type PaymentStackParamList = {
  PaymentCheckout: {
    routeData?: {
      id: string;
      bus: string;
      type: string;
      from: string;
      fromTime: string;
      to: string;
      toTime: string;
      price: number;
      date: string;
    };
  } | undefined;
  PaymentMethod: undefined;
  CardPayment: undefined;
  EWalletPayment: undefined;
  WalletTopUp: undefined;
  TicketSummary: undefined;
  MyETicket: undefined;
  SavedTickets: undefined;
  PaymentFailed: undefined;
  ConductorDashboard: undefined;
  ScanTicket: undefined;
  ManualCheck: undefined;
  ValidationResult: { ticketData: string };
  TicketHistory: { type: string };
  RevenueDetails: undefined;
};

export interface AppNavigatorProps {
  initialRouteName?: keyof PaymentStackParamList;
  onBackToHome?: () => void;
}

export const ScreenBackContext = React.createContext<{ onBackToHome?: () => void }>({});
