# R8 rules for SaddaHaQ release builds. React Native and most libraries ship their
# own consumer rules; only add rules here for something a release build proves broken.

# App-local TurboModule (OCR): React Native calls its methods from C++ over JNI by name,
# so R8 must not rename or remove them.
-keep class com.saddahaq.ocr.** { *; }
-keep class com.saddahaq.specs.** { *; }
