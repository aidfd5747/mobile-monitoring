import { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import api from "../../services/api";
import { AuthContext } from "../../context/authContext";

interface WorkerItem {
  id: string;
  nama: string;
  username?: string;
  role: string;
}

export default function WorkerListScreen() {
  const { user } = useContext(AuthContext);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/users");
      setWorkers(response.data.users || []);
    } catch (error) {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const confirmDelete = (worker: WorkerItem) => {
    if (worker.id === user?.id) {
      Alert.alert("Tidak bisa", "Anda tidak dapat menghapus akun sendiri");
      return;
    }

    Alert.alert(
      "Hapus worker",
      `Apakah Anda ingin menghapus akun ${worker.nama}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(worker.id);
              await api.delete(`/auth/users/${worker.id}`);
              setWorkers((prev) => prev.filter((item) => item.id !== worker.id));
              Alert.alert("Berhasil", "Akun worker berhasil dihapus");
            } catch (error) {
              Alert.alert("Gagal", "Tidak bisa menghapus akun worker saat ini");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daftar Worker</Text>
      <Text style={styles.subtitle}>Lihat akun worker dan hapus bila perlu.</Text>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada worker terdaftar.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.workerName}>{item.nama}</Text>
              <Text style={styles.workerMeta}>{item.username || "-"}</Text>
              <Text style={styles.workerRole}>{item.role === "worker" ? "Worker" : item.role}</Text>
            </View>
            <TouchableOpacity
              style={[styles.deleteButton, deletingId === item.id && styles.deleteButtonDisabled]}
              onPress={() => confirmDelete(item)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.deleteButtonText}>Hapus</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    color: "#64748b",
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  workerMeta: {
    color: "#64748b",
    marginTop: 4,
  },
  workerRole: {
    marginTop: 4,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptyCard: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
  },
});
