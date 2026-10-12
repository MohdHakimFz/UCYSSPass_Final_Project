import { ActivityIndicator, View } from 'react-native'
import { BRAND } from './src/lib/brand'
import { CalendarBlank, CalendarCheck, ChartBar, ListChecks, MapPin, QrCode, Ticket, UserCircle, Users } from 'phosphor-react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { AuthProvider, useAuth } from './src/lib/auth'
import { fonts } from './src/theme'
import { ThemeProvider, useTheme } from './src/lib/themeMode'
import EventsScreen from './src/screens/EventsScreen'
import EventDetailScreen from './src/screens/EventDetailScreen'
import PassesScreen from './src/screens/PassesScreen'
import AccountScreen from './src/screens/AccountScreen'
import AuthScreen from './src/screens/AuthScreen'
import WelcomeScreen from './src/screens/WelcomeScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import MyEventsScreen from './src/screens/organiser/MyEventsScreen'
import OrgBookingsScreen from './src/screens/organiser/OrgBookingsScreen'
import OverviewScreen from './src/screens/admin/OverviewScreen'
import UsersScreen from './src/screens/admin/UsersScreen'
import VenuesScreen from './src/screens/admin/VenuesScreen'
import EventFormScreen from './src/screens/organiser/EventFormScreen'
import OrgEventScreen from './src/screens/organiser/OrgEventScreen'
import TierFormScreen from './src/screens/organiser/TierFormScreen'
import EventBookingsScreen from './src/screens/organiser/EventBookingsScreen'
import ScanScreen from './src/screens/organiser/ScanScreen'
import AdminEventsScreen from './src/screens/admin/AdminEventsScreen'
import UserFormScreen from './src/screens/admin/UserFormScreen'
import VenueFormScreen from './src/screens/admin/VenueFormScreen'
import type { TicketType } from './src/lib/api'
import type { ManagedUser, Venue } from './src/lib/manage'
import { onlyFor } from './src/lib/roleGuard'
import { ConfirmHost } from './src/components/ConfirmDialog'

export type RootParamList = {
  Welcome: undefined
  Tabs: undefined
  EventDetail: { id: number }
  Login: undefined
  ForgotPassword: undefined
  Register: undefined
  Profile: undefined
  // Organiser
  EventForm: { id?: number }
  OrgEvent: { id: number }
  TierForm: { eventId: number; tier?: TicketType }
  // Organiser and admin. No eventId: every booking the user may see.
  EventBookings: { eventId?: number; title: string }
  // Admin
  UserForm: { user?: ManagedUser }
  VenueForm: { venue?: Venue }
}

const Stack = createNativeStackNavigator<RootParamList>()
const Tab = createBottomTabNavigator()

// The same header and tab bar look for every role, so the organiser and admin tabs feel like the same app.
function useTabOptions() {
  const { colors } = useTheme()
  return {
    headerStyle: { backgroundColor: colors.bar },
    headerTintColor: colors.onBar,
    headerTitleStyle: { fontFamily: fonts.heavy },
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: colors.inkSoft,
    tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
    tabBarStyle: { backgroundColor: colors.paper, height: 64, paddingTop: 6, paddingBottom: 8, borderTopWidth: 2, borderTopColor: colors.ink },
  }
}

// Each screen is wrapped with onlyFor(...), so a screen for another role sends the user back to their own home.
const Organiser = {
  MyEvents: onlyFor(['organiser'], MyEventsScreen),
  Bookings: onlyFor(['organiser'], OrgBookingsScreen),
  EventForm: onlyFor(['organiser'], EventFormScreen),
  OrgEvent: onlyFor(['organiser'], OrgEventScreen),
  TierForm: onlyFor(['organiser'], TierFormScreen),
  Scan: onlyFor(['organiser'], ScanScreen),
}
// Bookings for one event (or all of them): the API filters by role, so organiser and admin share the screen.
const EventBookings = onlyFor(['organiser', 'admin'], EventBookingsScreen)
const Admin = {
  Overview: onlyFor(['admin'], OverviewScreen),
  Users: onlyFor(['admin'], UsersScreen),
  Venues: onlyFor(['admin'], VenuesScreen),
  UserForm: onlyFor(['admin'], UserFormScreen),
  VenueForm: onlyFor(['admin'], VenueFormScreen),
  Events: onlyFor(['admin'], AdminEventsScreen),
}

// Customer home: the original three tabs, unchanged.
function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={useTabOptions()}>
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: BRAND.name, tabBarLabel: 'Events', tabBarIcon: ({ color, focused }) => <CalendarBlank size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Passes" component={PassesScreen} options={{ title: 'My passes', tabBarLabel: 'My passes', tabBarIcon: ({ color, focused }) => <Ticket size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account', tabBarIcon: ({ color, focused }) => <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
    </Tab.Navigator>
  )
}

// Organiser home: My events, Check-in (QR scanner), Bookings, Account.
function OrganiserTabs() {
  return (
    <Tab.Navigator screenOptions={useTabOptions()}>
      <Tab.Screen name="MyEvents" component={Organiser.MyEvents} options={{ title: 'My events', tabBarLabel: 'My events', tabBarIcon: ({ color, focused }) => <CalendarBlank size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Scan" component={Organiser.Scan} options={{ title: 'Check-in', tabBarLabel: 'Check-in', tabBarIcon: ({ color, focused }) => <QrCode size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="OrgBookings" component={Organiser.Bookings} options={{ title: 'Bookings', tabBarLabel: 'Bookings', tabBarIcon: ({ color, focused }) => <ListChecks size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account', tabBarIcon: ({ color, focused }) => <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
    </Tab.Navigator>
  )
}

// Admin home: Overview, Events, Users, Venues, Account.
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={useTabOptions()}>
      <Tab.Screen name="Overview" component={Admin.Overview} options={{ title: 'Overview', tabBarLabel: 'Overview', tabBarIcon: ({ color, focused }) => <ChartBar size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="AdminEvents" component={Admin.Events} options={{ title: 'Events', tabBarLabel: 'Events', tabBarIcon: ({ color, focused }) => <CalendarCheck size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Users" component={Admin.Users} options={{ title: 'Users', tabBarLabel: 'Users', tabBarIcon: ({ color, focused }) => <Users size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Venues" component={Admin.Venues} options={{ title: 'Venues', tabBarLabel: 'Venues', tabBarIcon: ({ color, focused }) => <MapPin size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account', tabBarIcon: ({ color, focused }) => <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
    </Tab.Navigator>
  )
}

// After sign-in, user.role decides which home ("Tabs") the user gets.
const HOME = { customer: CustomerTabs, organiser: OrganiserTabs, admin: AdminTabs }

// The app is for signed-in people. Signed out, the only screens are Welcome, Sign in and Sign up.
function Screens() {
  const { user, loading } = useAuth()
  const { colors } = useTheme()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.concrete }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bar },
        headerTintColor: colors.onBar,
        headerTitleStyle: { fontFamily: fonts.heavy },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={HOME[user.role] ?? CustomerTabs} options={{ headerShown: false }} />
          {user.role === 'customer' && <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />}
          {user.role === 'organiser' && (
            <>
              <Stack.Screen name="EventForm" component={Organiser.EventForm} options={{ title: 'Event' }} />
              <Stack.Screen name="OrgEvent" component={Organiser.OrgEvent} options={{ title: 'Event' }} />
              <Stack.Screen name="TierForm" component={Organiser.TierForm} options={{ title: 'Tier' }} />
            </>
          )}
          {(user.role === 'organiser' || user.role === 'admin') && <Stack.Screen name="EventBookings" component={EventBookings} options={{ title: 'Bookings' }} />}
          {user.role === 'admin' && (
            <>
              <Stack.Screen name="UserForm" component={Admin.UserForm} options={{ title: 'User' }} />
              <Stack.Screen name="VenueForm" component={Admin.VenueForm} options={{ title: 'Venue' }} />
            </>
          )}
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}

// Inside the ThemeProvider, so the navigation colours and the status bar follow light, dark or auto.
function Shell() {
  const { colors, isDark } = useTheme()
  const theme = { ...DefaultTheme, dark: isDark, colors: { ...DefaultTheme.colors, background: colors.concrete, card: colors.bar, text: colors.ink, border: colors.line, primary: colors.ink } }

  return (
    <NavigationContainer theme={theme}>
      {/* The headers are dark in both themes, so the clock and battery are light. Screens without a header set their own. */}
      <StatusBar style="light" />
      <Screens />
      {/* The app's own confirm dialog (askConfirm), shown above every screen. */}
      <ConfirmHost />
    </NavigationContainer>
  )
}

export default function App() {
  const [loaded] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold })

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EAEE' }}>
        <ActivityIndicator color="#14181F" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
