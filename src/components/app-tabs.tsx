import { useTema } from '@/lib/tema';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const { C, modo } = useTema();
  const celeste = modo === 'dark' ? '#6FA8FF' : '#2F6FE0';

  return (
    <NativeTabs
      key={modo}
      backgroundColor={C.bg}
      indicatorColor={C.panel2}
      iconColor={{ default: celeste, selected: celeste }}
      labelStyle={{ default: { color: C.dim }, selected: { color: C.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('@/assets/images/tabIcons/home.png'),
            selected: require('@/assets/images/tabIcons/home-selected.png'),
          }}
          renderingMode="original"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mapa">
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('@/assets/images/tabIcons/mapa.png'),
            selected: require('@/assets/images/tabIcons/mapa-selected.png'),
          }}
          renderingMode="original"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('@/assets/images/tabIcons/agenda.png'),
            selected: require('@/assets/images/tabIcons/agenda-selected.png'),
          }}
          renderingMode="original"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('@/assets/images/tabIcons/perfil.png'),
            selected: require('@/assets/images/tabIcons/perfil-selected.png'),
          }}
          renderingMode="original"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}