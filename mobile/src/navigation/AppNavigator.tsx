import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentCheckout from '../screens/payment/PaymentCheckout';
import PaymentMethod from '../screens/payment/PaymentMethod';
import CardPayment from '../screens/payment/CardPayment';
import EWalletPayment from '../screens/payment/EWalletPayment';
import WalletTopUp from '../screens/payment/WalletTopUp';
import TicketSummary from '../screens/payment/TicketSummary';
import MyETicket from '../screens/payment/MyETicket';
import SavedTickets from '../screens/payment/SavedTickets';

import ConductorDashboard from '../screens/conductor/ConductorDashboard';
import ScanTicket from '../screens/conductor/ScanTicket';
import ManualCheck from '../screens/conductor/ManualCheck';
import ValidationResult from '../screens/conductor/ValidationResult';
import TicketHistory from '../screens/conductor/TicketHistory';
import RevenueDetails from '../screens/conductor/RevenueDetails';
import PaymentFailed from '../screens/payment/PaymentFailed';

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

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="PaymentCheckout">
      {/* 
        NOTE FOR VIDUMINA: For testing purposes, you can change initialRouteName 
        to "PaymentCheckout" to test the Passenger flow again.
      */}
      <Stack.Screen name="PaymentCheckout" component={PaymentCheckout} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethod} />
      <Stack.Screen name="CardPayment" component={CardPayment} />
      <Stack.Screen name="EWalletPayment" component={EWalletPayment} />
      <Stack.Screen name="WalletTopUp" component={WalletTopUp} />
      <Stack.Screen name="TicketSummary" component={TicketSummary} />
      <Stack.Screen name="MyETicket" component={MyETicket} />
      <Stack.Screen name="SavedTickets" component={SavedTickets} />
      <Stack.Screen name="PaymentFailed" component={PaymentFailed} />

      <Stack.Screen name="ConductorDashboard" component={ConductorDashboard} />
      <Stack.Screen name="ScanTicket" component={ScanTicket} />
      <Stack.Screen name="ManualCheck" component={ManualCheck} />
      <Stack.Screen name="ValidationResult" component={ValidationResult} />
      <Stack.Screen name="TicketHistory" component={TicketHistory} />
      <Stack.Screen name="RevenueDetails" component={RevenueDetails} />
    </Stack.Navigator>
  );
}
