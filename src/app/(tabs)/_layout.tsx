import { router, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { Icon, type IconName } from '@/ui/Icon';
import { color, type } from '@/ui/tokens';

function tabIcon(name: IconName) {
  return function TabIcon({ color: tint }: { color: ColorValue }) {
    return <Icon name={name} color={tint} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.tabInactive,
        tabBarLabelStyle: type.tab,
        tabBarStyle: { height: 80, borderTopColor: color.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon('house') }} />
      <Tabs.Screen name="activity" options={{ title: 'Movimientos', tabBarIcon: tabIcon('list') }} />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Agregar gasto',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" color={color.surface} size={26} />
            </View>
          ),
        }}
        listeners={{
          // The centre button opens the New expense modal instead of a tab.
          tabPress: (e) => {
            e.preventDefault();
            router.push('/expense/new');
          },
        }}
      />
      <Tabs.Screen name="summary" options={{ title: 'Resumen', tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: tabIcon('settings') }} />
    </Tabs>
  );
}
