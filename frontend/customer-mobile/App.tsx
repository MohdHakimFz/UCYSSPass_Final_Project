import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { AuthProvider } from './src/lib/auth'
import { colors, fonts } from './src/theme'
import EventsScreen from './src/screens/EventsScreen'
import EventDetailScreen from './src/screens/EventDetailScreen'
import PassesScreen from './src/screens/PassesScreen'
import AccountScreen from './src/screens/AccountScreen'
import AuthScreen from './src/screens/AuthScreen'
import ProfileScreen from './src/screens/ProfileScreen'

export type RootParamList = {
  Tabs: undefined
  EventDetail: { id: number }
  Login: undefined
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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
        tabBarStyle: { backgroundColor: colors.paper, height: 60, paddingBottom: 6, borderTopWidth: 2, borderTopColor: colors.ink },
        tabBarIconStyle: { display: 'none' },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: 'SentryPass' , tabBarLabel: 'Events' }} />
      <Tab.Screen name="Passes" component={PassesScreen} options={{ title: 'My passes', tabBarLabel: 'My passes' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', tabBarLabel: 'Account' }} />
    </Tab.Navigator>
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
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.ink },
              headerTintColor: colors.paper,
              headerTitleStyle: { fontFamily: fonts.heavy },
            }}
          >
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
            <Stack.Screen name="Login" component={AuthScreen} options={{ title: 'Sign in' }} />
            <Stack.Screen name="Register" component={AuthScreen} options={{ title: 'Create account' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
