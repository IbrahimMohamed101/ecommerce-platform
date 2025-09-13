document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const statusElement = document.getElementById('verificationStatus');
    const loadingElement = document.getElementById('loading');
    const successElement = document.getElementById('success');
    const errorElement = document.getElementById('error');

    // Show loading state
    if (loadingElement) loadingElement.style.display = 'block';
    if (successElement) successElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'none';

    if (!token) {
        showError('رابط التحقق غير صالح. يرجى استخدام الرابط المرسل إلى بريدك الإلكتروني.');
        return;
    }

    try {
        // Send verification request to the server
        const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'فشل في التحقق من البريد الإلكتروني');
        }

        // Show success message
        showSuccess();
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
            window.location.href = '/login';
        }, 5000);

    } catch (error) {
        console.error('Verification error:', error);
        showError(error.message || 'حدث خطأ أثناء التحقق من البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.');
    }

    function showError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-message error';
            statusElement.style.display = 'block';
        }
        if (loadingElement) loadingElement.style.display = 'none';
    }

    function showSuccess() {
        if (successElement) {
            successElement.style.display = 'block';
        } else if (statusElement) {
            statusElement.textContent = 'تم التحقق من بريدك الإلكتروني بنجاح! يتم تحويلك إلى صفحة تسجيل الدخول...';
            statusElement.className = 'status-message success';
            statusElement.style.display = 'block';
        }
        if (loadingElement) loadingElement.style.display = 'none';
    }
});
