import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window'); // Obtém a largura da tela

const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF5733' }]} // Cor personalizada
        onPress={() => navigation.navigate('Orders')}
      >
        <Text style={styles.buttonText}>Pedidos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#33B5FF' }]} // Cor personalizada
        onPress={() => navigation.navigate('Products')}
      >
        <Text style={styles.buttonText}>Produtos</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', // Alinha os botões no centro horizontalmente
    justifyContent: 'flex-start', // Alinha os botões no topo
    paddingTop: 20, // Espaçamento no topo
    backgroundColor: '#f5f5f5', // Cor de fundo
  },
  button: {
    width: width * 0.9, // Botão ocupa 90% da largura da tela
    height: 50, // Altura do botão
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, // Espaçamento entre os botões
    borderRadius: 5, // Bordas arredondadas (opcional)
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;
