import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ImageBackground, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen({ navigation }) {
  const [isEmailLogin, setIsEmailLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return true;//emailRegex.test(email);
  };

  const handleSubmit = () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (password.length < 3) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    if (!isEmailLogin && !fullName) {
      Alert.alert('Invalid Name', 'Please enter your full name');
      return;
    }

    if (!isEmailLogin && !phone) {
      Alert.alert('Invalid Phone', 'Please enter your phone number');
      return;
    }

    // If validation passes, navigate to MainApp
    navigation.replace('MainApp');
  };

  const handleGoogleSignIn = () => {
    // Implement Google Sign In
    console.log('Google Sign In');
  };

  const handleForgotPassword = () => {
    // Implement Forgot Password
    console.log('Forgot Password');
  };

  const renderSignUpFields = () => {
    if (!isEmailLogin) {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color="#666" 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons 
              name="phone-portrait-outline" 
              size={20} 
              color="#666" 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#666"
            />
          </View>
        </>
      );
    }
    return null;
  };

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <View style={styles.branding}>
        <Text style={styles.brandName}>NEXT<Text style={styles.brandHighlight}>STEP</Text></Text>
        <Text style={styles.tagline}>Your next career move, simplified.</Text>
        <Text style={styles.signInLabel}>Sign-in to apply for jobs.</Text>
      </View>

      <View style={styles.loginOptions}>
        <TouchableOpacity 
          style={[styles.loginOption, isEmailLogin && styles.activeLoginOption]}
          onPress={() => setIsEmailLogin(true)}
        >
          <Text style={[styles.loginOptionText, isEmailLogin && styles.activeLoginOptionText]}>
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.loginOption, !isEmailLogin && styles.activeLoginOption]}
          onPress={() => setIsEmailLogin(false)}
        >
          <Text style={[styles.loginOptionText, !isEmailLogin && styles.activeLoginOptionText]}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {renderSignUpFields()}

        <View style={styles.inputContainer}>
          <Ionicons 
            name="mail-outline"
            size={20} 
            color="#666" 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons 
            name="lock-closed-outline" 
            size={20} 
            color="#666" 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleSubmit}>
          <Text style={styles.loginButtonText}>{isEmailLogin ? 'LOGIN' : 'SUBMIT'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Image 
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {isEmailLogin && (
          <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  loginOptions: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 5,
    marginBottom: 30,
    marginTop: 50,
  },
  loginOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeLoginOption: {
    backgroundColor: '#fff',
  },
  loginOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  activeLoginOptionText: {
    color: '#6441A5',
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#7C5DFA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  forgotPassword: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  forgotPasswordText: {
    color: '#fff',
    fontSize: 16,
  },
  branding: {
    alignItems: 'center',
    marginTop: 80,
  },
  brandName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  brandHighlight: {
    color: '#FFB6C1', // Light pink color as shown in the screenshot
  },
  tagline: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.9,
  },
  signInLabel: {
    color: '#fff',
    fontSize: 24,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 