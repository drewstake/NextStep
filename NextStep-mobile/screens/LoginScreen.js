import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ImageBackground, Image, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a cross-platform alert function
const showAlert = (title, message, isVerificationError = false) => {
  if (Platform.OS === 'web') {
    // Use browser's native alert for web
    window.alert(`${title}\n${message}`);
  } else {
    // Use React Native Alert for mobile platforms
    Alert.alert(
      title,
      message,
      isVerificationError 
        ? [
            {
              text: 'Resend Email',
              onPress: () => handleResendVerification(email),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        : [{ text: 'OK' }]
    );
  }
};

export default function LoginScreen({ navigation }) {
  const [isEmailLogin, setIsEmailLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const companyId = await AsyncStorage.getItem('companyId');
        if (token) {
          navigation.replace('MainApp', { companyId });
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };

    checkToken();
  }, [navigation]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return true;//emailRegex.test(email);
  };

  
  const handleSubmit = async () => {
    // Validate inputs first
    if (!validateEmail(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (password.length < 3) {
      showAlert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    if (!isEmailLogin && !fullName) {
      showAlert('Invalid Name', 'Please enter your full name');
      return;
    }

    if (!isEmailLogin && !phone) {
      showAlert('Invalid Phone', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);

    try {
      if (isEmailLogin) {
        // Handle Sign In
        const response = await api.post('/signin', {
          email,
          password
        });

        // Store the token securely (you might want to use AsyncStorage or a secure storage solution)
        const { token, full_name, isEmployer, companyId } = response.data;
        
        // TODO: Store token securely
        await AsyncStorage.setItem('userToken', token);
        if (companyId) {
          await AsyncStorage.setItem('companyId', companyId);
        }
        
        // Navigate to MainApp
        navigation.replace('MainApp', { companyId });
      } else {
        // Handle Sign Up
        const response = await api.post('/signup', {
          full_name: fullName,
          email,
          password,
          phone,
          employerFlag: false // Set to false for job seekers by default
        });

        showAlert('Success', response.data.message);
        setIsEmailLogin(true); // Switch to login view after successful registration
      }
    } catch (error) {
      console.log("Login Error", error);
      let errorMessage = 'An error occurred. Make sure the API server is up, and try again.';
      debugger;      
      if (error.response) {
        // Server responded with an error
        const { status, data } = error.response;

        if (status === 401) {
          // Handle unauthorized errors
          if (data.emailNotVerified) {
            // Special case for unverified email
            showAlert('Email Not Verified', data.message, true);
            return;
          }
          // Handle other 401 errors (invalid credentials)
          errorMessage = data.error || 'Invalid email or password';
        } else if (status === 400) {
          // Handle bad request errors
          errorMessage = data.error || 'Please check your input and try again';
        } else if (status === 429) {
          // Handle rate limiting
          errorMessage = data.error || 'Too many attempts. Please try again later';
        } else if (status >= 500) {
          // Handle server errors
          errorMessage = 'Server error. Check server logs for more details. Please try again later';
        }else if(status === 409 ) {
          // Handle unauthorized errors
          errorMessage = data.error;
          
        } else {
          // Handle other status codes
          errorMessage = data.message || errorMessage;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to reach the server. Please check your internet connection';
      }
      
      showAlert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Implement Google Sign In logic here
      // After getting Google token:
      const googleToken = 'YOUR_GOOGLE_TOKEN';
      const response = await api.post('/auth/google', {
        token: googleToken
      });

      // Handle successful Google sign in
      const { token, isEmployer , companyId } = response.data;
      // TODO: Store token securely
      navigation.replace('MainApp');
    } catch (error) {
      showAlert('Error', 'Google sign in failed. Please try again.');
    }
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

  // Add loading indicator to the login button
  const renderButtonContent = () => {
    if (isLoading) {
      return <ActivityIndicator color="#fff" />;
    }
    return <Text style={styles.loginButtonText}>{isEmailLogin ? 'LOGIN' : 'SUBMIT'}</Text>;
  };

  // Add a function to handle email verification resend
  const handleResendVerification = async (email) => {
    try {
      setIsResending(true);
      await api.post('/resend-verification', { email });
      showAlert('Success', 'Verification email has been resent. Please check your inbox.');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      showAlert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
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

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {renderButtonContent()}
        </TouchableOpacity>

{/*         <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Image 
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
 */}
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