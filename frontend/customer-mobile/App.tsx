import { ActivityIndicator, View } from 'react-native'
import { BRAND } from './src/lib/brand'
import { CalendarBlank, Ticket, UserCircle } from 'phosphor-react-native'
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

export type RootParamList = {
  Welcome: undefined
  Tabs: undefined
  EventDetail: { id: number }
  Login: undefined
  ForgotPassword: undefined
  Register: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootParamList>()
const Tab = createBottomTabNavigator()

function Tabs() {
  const { colors } = useTheme()
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bar },
        headerTintColor: colors.onBar,
        headerTitleStyle: { fontFamily: fonts.heavy },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
        tabBarStyle: { backgroundColor: colors.paper, height: 64, paddingTop: 6, paddingBottom: 8, borderTopWidth: 2, borderTopColor: colors.ink },
      }}
    >
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: BRAND.name, tabBarLabel: 'Events', tabBarIcon: ({ color, focused }) => <CalendarBlank size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Passes" component={PassesScreen} options={{ title: 'My passes', tabBarLabel: 'My passes', tabBarIcon: ({ color, focused }) => <Ticket size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account', tabBarIcon: ({ color, focused }) => <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
    </Tab.Navigator>
  )
}

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
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
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
