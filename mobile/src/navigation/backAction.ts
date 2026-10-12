type BackOptions = {
  explicit?: () => void;
  navigation?: {canGoBack: () => boolean; goBack: () => void} | null;
  moduleBack?: () => void;
  appBack: () => void;
};
export function performBack({explicit,navigation,moduleBack,appBack}:BackOptions) {
  if (explicit) explicit();
  else if (navigation?.canGoBack()) navigation.goBack();
  else (moduleBack || appBack)();
}
