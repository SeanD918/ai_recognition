import cv2

def is_hand(image_path):
    """
    Validates if an image contains a hand.
    """
    try:
        import mediapipe as mp
    except ImportError:
        # If mediapipe is not installed, skip validation
        return True, "Validation skipped (mediapipe not installed)"

    mp_hands = mp.solutions.hands
    with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
        image = cv2.imread(image_path)
        if image is None:
            return False, "Image not found"
            
        results = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if results.multi_hand_landmarks:
            return True, "Hand detected"
        
        return False, "No hand detected"
