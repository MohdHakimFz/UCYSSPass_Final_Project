import { ActivityIndicator, View } from 'react-native'
import { CalendarBlank, Ticket, UserCircle } from 'phosphor-react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { AuthProvider, useAuth } from './src/lib/auth'
import { colors, fonts } from './src/theme'
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

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.concrete, primary: colors.ink } }

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper,
        headerTitleStyle: { fontFamily: fonts.heavy },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
        tabBarStyle: { backgroundColor: colors.paper, height: 64, paddingTop: 6, paddingBottom: 8, borderTopWidth: 2, borderTopColor: colors.ink },
      }}
    >
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: 'SentryPass', tabBarLabel: 'Events', tabBarIcon: ({ color, focused }) => <CalendarBlank size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Passes" component={PassesScreen} options={{ title: 'My passes', tabBarLabel: 'My passes', tabBarIcon: ({ color, focused }) => <Ticket size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account', tabBarIcon: ({ color, focused }) => <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />
    </Tab.Navigator>
  )
}

// The app is for signed-in people. Signed out, the only screens are Welcome, Sign in and Sign up.
function Screens() {
  const { user, loading } = useAuth()

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
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper,
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

export default function App() {
  const [loaded] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold })

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.concrete }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="dark" />
          <Screens />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
