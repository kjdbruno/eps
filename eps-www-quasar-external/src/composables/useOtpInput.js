import { ref, nextTick } from 'vue';

// Shared behaviour for a 6-box one-time-code input: single digit per box, auto-advance on
// type/backspace, and paste-splitting a full code across the boxes. Used by both the
// complaint OTP dialog and the account email-verification dialog.
export function useOtpInput(length = 6) {
  const code = ref(Array(length).fill(''));
  const inputs = ref([]);

  const reset = () => {
    code.value = Array(length).fill('');
  };

  const onInput = async (val, index) => {
    code.value[index] = val.replace(/\D/g, '').charAt(0) || '';

    if (code.value[index] && index < inputs.value.length - 1) {
      await nextTick();
      inputs.value[index + 1]?.focus();
    }
  };

  const onBackspace = async (index) => {
    if (!code.value[index] && index > 0) {
      await nextTick();
      inputs.value[index - 1]?.focus();
    }
  };

  const onPaste = async (e) => {
    // Without this, the browser's own default paste ALSO runs after this handler returns —
    // since each box is maxlength="1", it clips the full clipboard text down to just its first
    // character and drops that into whichever box was focused at paste time, overwriting the
    // correct digit this handler just placed there with the wrong one.
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    pasted.split('').forEach((char, i) => {
      if (code.value[i] !== undefined) {
        code.value[i] = char;
      }
    });

    await nextTick();
    inputs.value[Math.min(pasted.length, length - 1)]?.focus();
  };

  const value = () => code.value.join('');
  const isComplete = () => new RegExp(`^\\d{${length}}$`).test(value());

  return { code, inputs, reset, onInput, onBackspace, onPaste, value, isComplete };
}
