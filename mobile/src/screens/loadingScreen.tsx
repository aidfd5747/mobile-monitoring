import {
  View,
  ActivityIndicator,
} from "react-native";

// Layar sementara saat aplikasi memuat data atau menunggu proses
export default function LoadingScreen() {

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator
        size="large"
      />
    </View>
  );
}