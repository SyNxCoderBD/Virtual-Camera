import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig, initialUser } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const cameraButton = document.getElementById('cameraButton');
const fileInput = document.getElementById('fileInput');
const imageGrid = document.getElementById('imageGrid');
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplay = document.getElementById('userDisplay');
const showLoginBtn = document.getElementById('showLogin');
const showSignupBtn = document.getElementById('showSignup');

let currentUser = { ...initialUser };

function handleImageCapture(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (file && auth.currentUser) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Maintain original dimensions
                const width = img.width;
                const height = img.height;
                canvas.width = width;
                canvas.height = height;
                
                // Draw image onto the canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL with maximum quality
                const imageData = canvas.toDataURL('image/jpeg', 1.0);
                saveImage(imageData);
            };
        };
        reader.readAsDataURL(file);
    }
}

function saveImage(imageData) {
    const imagesRef = ref(database, 'images');
    push(imagesRef, {
        imageUrl: imageData,
        timestamp: Date.now(),
        userId: auth.currentUser.uid
    }).then(() => {
        console.log('Image saved successfully');
        fileInput.value = '';
    }).catch((error) => {
        console.error('Error saving image:', error);
        alert('Error saving image. Please try again.');
    });
}

function deleteImage(imageKey) {
    const imageRef = ref(database, `images/${imageKey}`);
    remove(imageRef)
        .then(() => console.log('Image deleted successfully'))
        .catch((error) => {
            console.error('Error deleting image:', error);
            alert('Error deleting image. Please try again.');
        });
}

function displayImages() {
    if (!auth.currentUser) {
        console.log('No user logged in');
        return;
    }
    const imagesRef = ref(database, 'images');
    const userImagesQuery = query(imagesRef, orderByChild('userId'), equalTo(auth.currentUser.uid));
    onValue(userImagesQuery, (snapshot) => {
        imageGrid.innerHTML = '';
        const images = snapshot.val();
        if (images) {
            Object.entries(images).forEach(([key, image]) => {
                const card = document.createElement('div');
                card.className = 'image-card';
                
                const img = document.createElement('img');
                img.src = image.imageUrl;
                
                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'button-group';
                
                const downloadBtn = document.createElement('a');
                downloadBtn.className = 'download-btn';
                downloadBtn.innerHTML = 'Download';
                downloadBtn.href = image.imageUrl;
                downloadBtn.download = `IMG_${Date.now()}.jpg`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = 'Delete';
                deleteBtn.onclick = () => {
                    if (confirm('Are you sure you want to delete this image?')) {
                        deleteImage(key);
                    }
                };
                
                buttonGroup.appendChild(downloadBtn);
                buttonGroup.appendChild(deleteBtn);
                card.appendChild(img);
                card.appendChild(buttonGroup);
                imageGrid.appendChild(card);
            });
        } else {
            console.log('No images found for user');
        }
    }, (error) => {
        console.error('Error fetching images:', error);
    });
}

function handleAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser.email = user.email;
            userDisplay.textContent = `Logged in as: ${user.email}`;
            authSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            displayImages();
        } else {
            currentUser = { ...initialUser };
            authSection.classList.remove('hidden');
            mainContent.classList.add('hidden');
            imageGrid.innerHTML = '';
        }
    });
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => alert('Login error: ' + error.message));
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    createUserWithEmailAndPassword(auth, email, password)
        .catch((error) => alert('Signup error: ' + error.message));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => alert('Logout error: ' + error.message));
});

cameraButton.addEventListener('click', () => {
    if (auth.currentUser) {
        fileInput.click();
    } else {
        alert('Please log in first');
    }
});

fileInput.addEventListener('change', handleImageCapture);
showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
});
showSignupBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

// Initialize auth state handler
handleAuth();
