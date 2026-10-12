import { useEffect, type ComponentType } from 'react'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { useAuth } from './auth'
import type { User } from './api'

export type Role = User['role']

/**
 * Wraps a screen so only the given roles can see it. Anyone else is sent back to their own home ("Tabs"),
 * which App.tsx fills with the tabs for their role. The navigator already registers only the screens for the
 * signed-in role, so this is the second line of defence, in case a screen is reached some other way.
 */
export function onlyFor<P extends object>(roles: Role[], Screen: ComponentType<P>) {
  function Guarded(props: P) {
    const { user } = useAuth()
    const navigation = useNavigation()
    const allowed = !!user && roles.includes(user.role)

    useEffect(() => {
      if (!user || allowed) return
      // "Tabs" lives in the outermost stack, so reset that one, not the tab bar this screen sits in.
      let root = navigation
      while (root.getParent()) root = root.getParent()
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }))
    }, [user, allowed, navigation])

    return allowed ? <Screen {...props} /> : null
  }
  Guarded.displayName = `OnlyFor(${roles.join(',')})`
  return Guarded
}
