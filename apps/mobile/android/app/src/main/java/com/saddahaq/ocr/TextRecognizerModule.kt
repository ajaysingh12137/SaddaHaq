package com.saddahaq.ocr

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.MlKitException
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.saddahaq.specs.NativeTextRecognizerSpec
import java.io.File
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors

/**
 * Reads text from an earnings screenshot with Google ML Kit, entirely on the
 * phone. Models come from Google Play services (downloaded at install time via
 * the manifest), so the APK stays small. The image is never uploaded.
 */
class TextRecognizerModule(private val context: ReactApplicationContext) :
  NativeTextRecognizerSpec(context) {

  // ML Kit's blocking await must not run on the JS or main thread.
  private val executor = Executors.newSingleThreadExecutor()

  override fun getName() = NAME

  override fun recognize(uri: String, promise: Promise) {
    executor.execute {
      try {
        val image = InputImage.fromFilePath(context, Uri.parse(uri))
        val texts = mutableListOf<String>()
        var unavailable = 0
        // Latin first (most earnings screens), then Devanagari for Hindi labels.
        for (recognizer in recognizers()) {
          try {
            texts.add(Tasks.await(recognizer.process(image)).text)
          } catch (e: ExecutionException) {
            val cause = e.cause
            if (cause is MlKitException && cause.errorCode == MlKitException.UNAVAILABLE) {
              unavailable++
            } else {
              throw cause ?: e
            }
          } finally {
            recognizer.close()
          }
        }
        if (unavailable == RECOGNIZER_COUNT) {
          promise.reject("unavailable", "Text recognition model is not downloaded yet")
        } else {
          promise.resolve(texts.filter { it.isNotBlank() }.joinToString("\n"))
        }
      } catch (e: Exception) {
        promise.reject("failed", e.message ?: "Text recognition failed", e)
      } finally {
        deleteIfInCache(uri)
      }
    }
  }

  private fun recognizers(): List<TextRecognizer> =
    listOf(
      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS),
      TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build()),
    )

  /** Deletes the picker's resized copy; never touches the worker's own gallery files. */
  private fun deleteIfInCache(uri: String) {
    val parsed = Uri.parse(uri)
    if (parsed.scheme != "file") return
    val path = parsed.path ?: return
    val file = File(path).canonicalFile
    val cacheDir = context.cacheDir.canonicalFile
    if (file.path.startsWith(cacheDir.path + File.separator)) {
      file.delete()
    }
  }

  override fun invalidate() {
    executor.shutdown()
    super.invalidate()
  }

  companion object {
    const val NAME = "TextRecognizer"
    private const val RECOGNIZER_COUNT = 2
  }
}
