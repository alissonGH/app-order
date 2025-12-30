import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, Dimensions, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import THEME from '../styles/theme';
import { API_URL } from '../config/api';
import { getToken } from '../auth/tokenStorage';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { handleAuthErrorResponse } from '../utils/authErrorHandler';

const { width } = Dimensions.get('window');

// Orders per hour chart (6:00 - 18:00)
type HourPoint = { hour: number; count: number };

type OrdersByHourApiPoint = { hour: number; count: number };
type OrdersByHourApiResponse = {
  date: string;
  timezone?: string;
  startHour?: number;
  endHour?: number;
  points: OrdersByHourApiPoint[];
};

function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Vertical hour chart: each hour is a row with a horizontal bar
const SimpleHourChart: React.FC<{ data: HourPoint[]; onBarPress?: (p: HourPoint) => void }> = ({ data, onBarPress }) => {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={[styles.chartContainer, { marginTop: 6 }]}>
      <Text style={styles.chartTitle}>Pedidos por hora (06:00 - 18:00)</Text>
      <View style={styles.hourList}>
        {data.map((d) => {
          const widthPct = Math.round((d.count / max) * 100);
          return (
            <Pressable key={d.hour} style={styles.hourRow} onPress={() => onBarPress && onBarPress(d)}>
              <Text style={styles.hourLabel}>{`${d.hour}h`}</Text>
              <View style={styles.horizontalBarContainer}>
                <View style={[styles.horizontalBarFill, { width: `${widthPct}%`, backgroundColor: THEME.success }]} />
              </View>
              <Text style={styles.hourCount}>{d.count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Top 10 products sold (vertical list with horizontal bars)
type ProductPoint = { id: string; name: string; sold: number };

type TopProductsApiItem = { productId: number; productName: string; soldQuantity: number };
type TopProductsApiResponse = {
  startDate: string;
  endDate: string;
  limit?: number;
  items: TopProductsApiItem[];
};

const SimpleTopProductsChart: React.FC<{ data: ProductPoint[]; onItemPress?: (p: ProductPoint) => void }> = ({ data, onItemPress }) => {
  const max = Math.max(...data.map((d) => d.sold), 1);

  return (
    <View style={[styles.chartContainer, { marginTop: 6 }]}>
      <Text style={styles.chartTitle}>Top 10 produtos mais vendidos</Text>
      <View style={styles.productList}>
        {data.map((p) => {
          // show name and numeric count at right; remove the blue bar to avoid overlap
          return (
            <Pressable key={p.id} style={styles.productRow} onPress={() => onItemPress && onItemPress(p)}>
              <Text style={styles.productLabel} numberOfLines={1} ellipsizeMode="tail">{p.name}</Text>
              <Text style={styles.productCount}>{p.sold}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const dispatch = useDispatch();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [ordersByHour, setOrdersByHour] = useState<HourPoint[]>(() => {
    const pts: HourPoint[] = [];
    for (let h = 6; h <= 18; h++) pts.push({ hour: h, count: 0 });
    return pts;
  });
  const [topProducts, setTopProducts] = useState<ProductPoint[]>([]);

  const fetchOrdersByHour = useCallback(async () => {
    const date = toLocalISODate(new Date());
    const startHour = 6;
    const endHour = 18;
    const status = 'CONCLUDED';
    const timezone = 'America/Sao_Paulo';

    const token = await getToken();
    const url = `${API_URL}/dashboard/orders-by-hour?date=${encodeURIComponent(date)}&startHour=${startHour}&endHour=${endHour}&status=${encodeURIComponent(status)}&timezone=${encodeURIComponent(timezone)}`;

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeoutMs: 15000,
    });

    if (!response.ok) {
      const handled = await handleAuthErrorResponse(response, dispatch);
      if (handled) return;
      const errorText = await response.text();
      console.error('orders-by-hour failed', { status: response.status, errorText });
      throw new Error('Falha ao carregar pedidos por hora.');
    }

    const data = (await response.json()) as OrdersByHourApiResponse;
    const map = new Map<number, number>((data.points || []).map((p) => [p.hour, p.count]));
    const filled: HourPoint[] = [];
    for (let h = startHour; h <= endHour; h++) {
      filled.push({ hour: h, count: map.get(h) ?? 0 });
    }
    setOrdersByHour(filled);
  }, [dispatch]);

  const fetchTopProducts = useCallback(async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    const startDate = toLocalISODate(start);
    const endDate = toLocalISODate(end);
    const limit = 10;
    const status = 'CONCLUDED';
    const timezone = 'America/Sao_Paulo';

    const token = await getToken();
    const url = `${API_URL}/dashboard/top-products?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=${limit}&status=${encodeURIComponent(status)}&timezone=${encodeURIComponent(timezone)}`;

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeoutMs: 15000,
    });

    if (!response.ok) {
      const handled = await handleAuthErrorResponse(response, dispatch);
      if (handled) return;
      const errorText = await response.text();
      console.error('top-products failed', { status: response.status, errorText });
      throw new Error('Falha ao carregar top produtos.');
    }

    const data = (await response.json()) as TopProductsApiResponse;
    const mapped: ProductPoint[] = (data.items || []).map((it) => ({
      id: String(it.productId),
      name: it.productName,
      sold: it.soldQuantity,
    }));
    setTopProducts(mapped);
  }, [dispatch]);

  const refreshDashboard = useCallback(async () => {
    try {
      await Promise.all([fetchOrdersByHour(), fetchTopProducts()]);
    } catch (e: any) {
      console.error('refreshDashboard error', e);
      Alert.alert('Erro', e?.message || 'Falha ao carregar dados do dashboard.');
    }
  }, [fetchOrdersByHour, fetchTopProducts]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDashboard]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return (
    <View style={styles.simpleContainer}>
      <View style={styles.chartsWrap}>
        <ScrollView
          contentContainerStyle={styles.scrollCharts}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[THEME.primary]}
              tintColor={THEME.primary}
            />
          }
        >
          <Text style={styles.welcome}>Bem-vindo</Text>

          <SimpleHourChart data={ordersByHour} />

          <SimpleTopProductsChart data={topProducts} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerWrap: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#6b7280',
  },
  loadingWrap: {
    alignItems: 'center',
    marginVertical: 20,
  },
  errorWrap: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  col2: {
    width: '48%',
  },
  col3: {
    width: '31%',
  },
  card: {
    borderRadius: 10,
    elevation: 2,
    paddingVertical: 6,
  },
  bigValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  smallMuted: {
    fontSize: 12,
    color: '#6b7280',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  topName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  topQty: {
    fontSize: 12,
    color: '#6b7280',
  },
  variationText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e6eef6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  chartContainer: {
    width: '96%',
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  simpleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: THEME.text,
  },
  button: {
    width: width * 0.9,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  hourList: {
    width: '100%',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    width: '94%',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  hourLabel: {
    width: 48,
    fontSize: 12,
    color: THEME.muted,
  },
  horizontalBarContainer: {
    flex: 1,
    height: 18,
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  horizontalBarFill: {
    height: '100%',
    backgroundColor: THEME.success,
  },
  hourCount: {
    width: 44,
    fontSize: 12,
    color: THEME.text,
    textAlign: 'right',
  },
  productList: {
    width: '100%',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    width: '94%',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    justifyContent: 'space-between',
  },
  productLabel: {
    flex: 1,
    fontSize: 13,
    color: THEME.text,
    marginRight: 8,
  },
  productBarContainer: {
    width: 120,
    height: 18,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    overflow: 'hidden',
    marginLeft: 8,
  },
  productCount: {
    width: 48,
    fontSize: 12,
    color: THEME.text,
    textAlign: 'right',
  },
  chartsWrap: {
    flex: 1,
    width: '100%',
  },
  scrollCharts: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  
});
