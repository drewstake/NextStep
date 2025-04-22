import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecommendationsScreen(navigation) {
    return (
        <View>
            <Text>Recommendations</Text>
        </View>
    )


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});
}