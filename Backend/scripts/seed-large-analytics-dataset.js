const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, User, Survey, Question, QuestionOption, SurveyResponse, Answer, QuestionType } = require('../src/models');
// const { faker } = require('@faker-js/faker'); // Removed as not available
const bcrypt = require('bcryptjs');

// Simple random helpers if faker not installed
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
    console.log('🌱 Starting Analytics Seeding...');

    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create Users
        console.log('Creating users...');
        const passwordHash = await bcrypt.hash('123456', 10);
        const users = [];
        const timestamp = Date.now();

        for (let i = 0; i < 5; i++) {
            try {
                const user = await User.create({
                    username: `analytics_user_${i}_${timestamp}`,
                    email: `user${i}_${timestamp}@example.com`,
                    password: passwordHash,
                    full_name: `Analytics Tester ${i}`,
                    role: 'user'
                });
                users.push(user);
            } catch (userError) {
                console.error('Error creating user:', userError.message);
                if (userError.errors) {
                    userError.errors.forEach(e => console.error(` - ${e.message}`));
                }
                throw userError;
            }
        }
        const admin = users[0]; // Use first user as owner

        // Check if users were created
        if (users.length === 0) {
            console.error('No users created! Cannot seed responses.');
            process.exit(1);
        }

        // 2. Get Question Types
        const types = await QuestionType.findAll();
        const typeMap = {};
        types.forEach(t => typeMap[t.type_name] = t.id);

        // 3. Create Surveys
        const surveysData = [
            { title: 'IT Satisfaction Survey', category: 'IT' },
            { title: 'Product Feedback', category: 'Sales' },
            { title: 'Education Quality', category: 'Education' }
        ];

        // Create a dummy template first
        const { SurveyTemplate } = require('../src/models');
        let template = await SurveyTemplate.findOne();
        if (!template) {
            template = await SurveyTemplate.create({
                title: 'Base Template',
                description: 'For seeding',
                created_by: admin.id
            });
        }

        for (const surveyData of surveysData) {
            console.log(`Creating Survey: ${surveyData.title}...`);
            const survey = await Survey.create({
                title: surveyData.title,
                description: `Large dataset test for ${surveyData.category}`,
                created_by: admin.id,
                status: 'active',
                is_public: true,
                template_id: template.id,
                start_date: new Date(),
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
            });

            // Create Questions
            const questions = [];

            // Q1: Choice (Department)
            console.log('Template ID:', template.id);
            const q1Payload = {
                survey_id: survey.id,
                template_id: template.id,
                question_text: 'Which department are you from?',
                label: 'Q1',
                question_type_id: typeMap['single_choice'],
                display_order: 1,
                is_required: true
            };
            console.log('Creating Q1 with:', JSON.stringify(q1Payload));
            const q1 = await Question.create(q1Payload);
            const q1Opts = await Promise.all(['Engineering', 'Sales', 'HR', 'Marketing'].map(txt =>
                QuestionOption.create({ question_id: q1.id, option_text: txt })
            ));
            questions.push({ q: q1, type: 'choice', opts: q1Opts });

            // Q2: Rating (Satisfaction)
            const q2 = await Question.create({
                survey_id: survey.id,
                template_id: template.id,
                question_text: 'How satisfied are you with our services?',
                label: 'Q2',
                question_type_id: typeMap['rating'],
                display_order: 2,
                is_required: true
            });
            questions.push({ q: q2, type: 'rating' });

            // Q3: Text (Feedback)
            const q3 = await Question.create({
                survey_id: survey.id,
                template_id: template.id,
                question_text: 'Any additional feedback?',
                label: 'Q3',
                question_type_id: typeMap['text'],
                display_order: 3,
                is_required: false
            });
            questions.push({ q: q3, type: 'text' });

            // Q4: Drop-off trap (Complex question)
            const q4 = await Question.create({
                survey_id: survey.id,
                template_id: template.id,
                question_text: 'Please describe your detailed technical issues (Optional)',
                label: 'Q4',
                question_type_id: typeMap['text'],
                display_order: 4,
                is_required: false
            });
            questions.push({ q: q4, type: 'text' });

            // Generate Responses
            console.log(`  Generating 1000 responses for ${surveyData.title}...`);
            const responsesToCreate = 1000;

            for (let i = 0; i < responsesToCreate; i++) {
                try {
                    // vary status
                    const isCompleted = Math.random() > 0.3; // 70% completion rate
                    const status = isCompleted ? 'completed' : 'started'; // use 'started' for incomplete
                    const timeTaken = randomInt(30, 600); // 30s to 10m

                    const hasUser = Math.random() > 0.5;
                    const userId = hasUser ? randomItem(users).id : null;
                    const email = hasUser ? null : (Math.random() > 0.5 ? `visitor${i}@gmail.com` : null);
                    const isAnonymous = !hasUser && !email;

                    const response = await SurveyResponse.create({
                        survey_id: survey.id,
                        respondent_id: userId,
                        respondent_email: email,
                        status: status,
                        time_taken: timeTaken,
                        is_anonymous: isAnonymous
                        // meta_info removed as it is not in the model definition
                    });

                    // Answers
                    // Q1: Choice
                    const q1Opt = randomItem(questions[0].opts);
                    await Answer.create({
                        survey_response_id: response.id, // Corrected from response_id to survey_response_id? Check Answer model
                        question_id: questions[0].q.id,
                        option_id: q1Opt.id,
                        text_answer: q1Opt.option_text
                    });

                    // Simulate Drop-off after Q1
                    if (!isCompleted && Math.random() > 0.5) continue;

                    // Q2: Rating
                    await Answer.create({
                        survey_response_id: response.id,
                        question_id: questions[1].q.id,
                        numeric_answer: randomInt(1, 5),
                        text_answer: String(randomInt(1, 5))
                    });

                    // Simulate Drop-off after Q2
                    if (!isCompleted && Math.random() > 0.5) continue;

                    // Q3: Text
                    if (Math.random() > 0.2) { // 80% answer text
                        const texts = ['Great service!', 'Needs improvement.', 'Okay.', 'Excellent!', 'aaaaaa', 'Very fast and reliable.'];
                        await Answer.create({
                            survey_response_id: response.id,
                            question_id: questions[2].q.id,
                            text_answer: randomItem(texts)
                        });
                    }

                    // Q4: Text (High drop off point if this was required, but it's optional)
                    if (isCompleted && Math.random() > 0.5) {
                        await Answer.create({
                            survey_response_id: response.id,
                            question_id: questions[3].q.id,
                            text_answer: "No specific technical issues."
                        });
                    }
                } catch (resError) {
                    const fs = require('fs');
                    fs.writeFileSync('seed_error.txt', JSON.stringify(resError, null, 2) + '\n' + resError.stack);
                    console.error('!!! FATAL ERROR CREATING RESPONSE !!!');
                    console.error('Check seed_error.txt for details');
                    process.exit(1);
                }
            }
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding Failed:', error);
        const fs = require('fs');
        fs.writeFileSync('seed_error.txt', JSON.stringify(error, null, 2) + '\n' + error.stack);
        process.exit(1);
    }
}

seed();
