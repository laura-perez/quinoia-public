/**
 * Builder for creating test submit request payloads
 * Follows the Builder pattern for flexible test data creation
 */
export class SubmitRequestBuilder {
  private recaptchaToken: string = 'valid_test_token_123';
  private form: Record<string, any> = this.createValidFormData();

  static create(): SubmitRequestBuilder {
    return new SubmitRequestBuilder();
  }

  withRecaptchaToken(token: string): SubmitRequestBuilder {
    this.recaptchaToken = token;
    return this;
  }

  withInvalidRecaptchaToken(): SubmitRequestBuilder {
    this.recaptchaToken = 'invalid_token';
    return this;
  }

  withEmptyRecaptchaToken(): SubmitRequestBuilder {
    this.recaptchaToken = '';
    return this;
  }

  withForm(form: Record<string, any>): SubmitRequestBuilder {
    this.form = form;
    return this;
  }

  withInvalidForm(): SubmitRequestBuilder {
    this.form = { invalid: true };
    return this;
  }

  withPartialForm(): SubmitRequestBuilder {
    this.form = {
      email: 'test@example.com',
      // Missing required fields
    };
    return this;
  }

  build() {
    return {
      recaptchaToken: this.recaptchaToken,
      form: this.form,
    };
  }

  buildAsString(): string {
    return JSON.stringify(this.build());
  }

  buildMalformed(): string {
    return '{ invalid json';
  }

  private createValidFormData(): Record<string, any> {
    return {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      age: 30,
      height: 180,
      weight: 75,
      dietaryRestrictions: [],
      primaryGoal: 'eatHealthier',
      activityLevel: 'moderate',
      cookingLevel: 'intermediate',
      availableEquipment: ['Oven'],
      proteinPreferences: ['Poultry', 'Fish'],
      diet: 'omnivore',
    };
  }
}
