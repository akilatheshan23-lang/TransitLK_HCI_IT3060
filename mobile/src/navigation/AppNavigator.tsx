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

import {
  PaymentStackParamList,
  AppNavigatorProps,
  ScreenBackContext,
} from './navigationTypes';

export type { PaymentStackParamList, AppNavigatorProps };
export { ScreenBackContext };

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export default function AppNavigator({ initialRouteName = 'PaymentCheckout', onBackToHome }: AppNavigatorProps = {}) {
  return (
    <ScreenBackContext.Provider value={{ onBackToHome }}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
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
    </ScreenBackContext.Provider>
  );
}
