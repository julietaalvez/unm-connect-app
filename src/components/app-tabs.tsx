import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const { theme } = useAppTheme();
  const colors = Colors[theme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
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

      {/* Pantalla a la que se llega desde el Inicio; no aparece en la barra */}
      <NativeTabs.Trigger name="profesores" />
    </NativeTabs>
  );
}