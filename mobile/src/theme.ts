import { Platform } from 'react-native';

export const colors = {
  ink: '#102A2A',
  muted: '#6E7E7A',
  canvas: '#F5F8F6',
  surface: '#FFFFFF',
  line: '#E3ECE7',
  green: '#0D9B6A',
  greenDeep: '#087451',
  greenSoft: '#E5F6EF',
  blue: '#2E5CB8',
  blueSoft: '#EAF0FF',
  amber: '#B86B18',
  amberSoft: '#FFF2DD',
  red: '#C94B4B',
  redSoft: '#FCECEC',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 44 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const shadow = Platform.select({
  android: { elevation: 3 },
  ios: { shadowColor: '#17352B', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  default: {},
});
