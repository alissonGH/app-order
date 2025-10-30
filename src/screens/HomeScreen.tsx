import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import THEME from '../styles/theme';

// Types
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type DailyRevenuePoint = { iso: string; total: number };

const { width } = Dimensions.get('window');

function genMockLast7(): DailyRevenuePoint[] {
  const arr: DailyRevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
    arr.push({ iso, total: Math.round(200 + Math.random() * 3000) });
  }
  return arr;
}

function shortCurrency(value: number) {
  // e.g. 1200 -> R$ 1,2k  | small values keep full format without cents
  if (value >= 1000) {
    // divide by 1000 and keep one decimal when needed
    const kRaw = Math.round((value / 1000) * 10) / 10; // one decimal in thousands
    const kStr = kRaw % 1 === 0 ? kRaw.toFixed(0) : kRaw.toFixed(1);
    return `R$ ${kStr.replace('.', ',')}k`;
  }
  // show integer BRL without cents to avoid long strings
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SimpleBarChart: React.FC<{ data: DailyRevenuePoint[]; onBarPress?: (p: DailyRevenuePoint) => void }> = ({ data, onBarPress }) => {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Faturamento diário (últimos 7 dias)</Text>
      <View style={styles.chartInner}>
        {data.map((d) => {
          const barHeight = Math.round((d.total / max) * 140);
          const dateObj = new Date(d.iso + 'T00:00:00');
          const weekday = weekdays[dateObj.getDay()];
          return (
            <Pressable
              key={d.iso}
              style={styles.chartColumn}
              onPress={() => onBarPress && onBarPress(d)}
            >
              {/* value on top to avoid wrapping under the label */}
              <Text style={styles.barValue} numberOfLines={1} ellipsizeMode="tail">
                {shortCurrency(d.total)}
              </Text>
              <View style={[styles.bar, { height: barHeight, backgroundColor: THEME.primary }]} />
              <Text style={styles.barLabel} numberOfLines={1} ellipsizeMode="tail">
                {weekday}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Orders per hour chart (6:00 - 18:00)
type HourPoint = { hour: number; count: number };

function genMockOrdersByHour(): HourPoint[] {
  const arr: HourPoint[] = [];
  for (let h = 6; h <= 18; h++) {
    // generate 0..20 orders per hour with a peak around midday
    const peak = 12;
    const distance = Math.abs(h - peak);
    const base = Math.max(0, 12 - distance * 1.8);
    const rand = Math.round(base + Math.random() * 6);
    arr.push({ hour: h, count: rand });
  }
  return arr;
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

function genMockTopProducts(): ProductPoint[] {
  const products: ProductPoint[] = [];
  const sampleNames = ['Café', 'Pão', 'Refrigerante', 'Suco', 'Sanduíche', 'Bolo', 'Água', 'Salada', 'Hambúrguer', 'Pizza', 'Cookie', 'Chá'];
  // pick 10 with descending sold counts
  for (let i = 0; i < 10; i++) {
    const name = sampleNames[i % sampleNames.length] + (i >= 5 ? ` ${i}` : '');
    const sold = Math.round(60 - i * 4 + Math.random() * 10); // decreasing
    products.push({ id: `p${i}`, name, sold });
  }
  return products.sort((a, b) => b.sold - a.sold).slice(0, 10);
}

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
  const navigation = useNavigation<NavigationProp>();

  // generate once
  const revenue = useMemo(() => genMockLast7(), []);
  const [selected, setSelected] = useState<DailyRevenuePoint | null>(null);
  const ordersByHour = useMemo(() => genMockOrdersByHour(), []);
  const topProducts = useMemo(() => genMockTopProducts(), []);

  return (
    <View style={styles.simpleContainer}>
      <Text style={styles.welcome}>Bem-vindo</Text>

      <View style={styles.chartsWrap}>
        <ScrollView contentContainerStyle={styles.scrollCharts} showsVerticalScrollIndicator={false}>
          <SimpleBarChart data={revenue} onBarPress={(p) => setSelected(p)} />

          <SimpleHourChart data={ordersByHour} />

          <SimpleTopProductsChart data={topProducts} />
        </ScrollView>
      </View>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Faturamento</Text>
            {selected && (
              <>
                <Text style={styles.modalDate}>{new Date(selected.iso).toLocaleDateString('pt-BR')}</Text>
                <Text style={styles.modalValue}>{selected.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
              </>
            )}
            <Pressable style={[styles.modalClose]} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  chartInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingHorizontal: 1,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 38,
    marginHorizontal: 1,
  },
  bar: {
    width: '75%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignSelf: 'center',
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    color: THEME.muted,
    maxWidth: 48,
  },
  barValue: {
    fontSize: 11,
    color: THEME.text,
    fontWeight: '700',
    marginBottom: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  modalDate: {
    color: THEME.muted,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.primary,
    marginBottom: 12,
  },
  modalClose: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: THEME.primary,
    borderRadius: 6,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '700',
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
