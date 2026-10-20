import { router, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useLiveHousehold } from '@/api/live';
import { Icon, type IconName } from '@/ui/Icon';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

function tabIcon(name: IconName) {
  return function TabIcon({ color: tint }: { color: ColorValue }) {
    return <Icon name={name} color={tint} />;
  };
}

export default function TabsLayout() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  useLiveHousehold();
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
      <Tabs.Screen name="index" options={{ title: m.tabs.home, tabBarIcon: tabIcon('house') }} />
      <Tabs.Screen name="activity" options={{ title: m.tabs.activity, tabBarIcon: tabIcon('list') }} />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarAccessibilityLabel: m.tabs.add,
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" color={color.onPrimary} size={26} />
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
      <Tabs.Screen name="summary" options={{ title: m.tabs.summary, tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: m.tabs.settings, tabBarIcon: tabIcon('settings') }} />
    </Tabs>
  );
}
