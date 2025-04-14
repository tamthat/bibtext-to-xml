function parseBibTeX(bibtex) {
    const result = {};
    
    // Tìm type và key
    const typeMatch = bibtex.match(/@(\w+)\s*{([^,]+),/);
    if (!typeMatch) return null;
    
    result.type = typeMatch[1].toLowerCase();
    result.key = typeMatch[2].trim();
    
    // Lấy nội dung fields
    const contentStart = bibtex.indexOf(',', typeMatch[0].length) + 1;
    const contentEnd = bibtex.lastIndexOf('}');
    let content = bibtex.slice(contentStart, contentEnd);
    
    // Tách fields
    const fields = [];
    let current = '';
    let braceLevel = 0;
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === '{' && !inQuotes) {
            braceLevel++;
        } else if (char === '}' && !inQuotes) {
            braceLevel--;
        } else if (char === ',' && braceLevel === 0 && !inQuotes) {
            if (current.trim()) fields.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) fields.push(current.trim());
    
    // Phân tích từng field
    for (let field of fields) {
        const equalIndex = field.indexOf('=');
        if (equalIndex === -1) continue;
        
        const key = field.slice(0, equalIndex).trim();
        let value = field.slice(equalIndex + 1).trim();
        
        // Xử lý giá trị
        let cleanedValue = value;
        if (value.startsWith('{') && value.endsWith('}')) {
            cleanedValue = value.slice(1, -1).trim();
        } else if (value.startsWith('"') && value.endsWith('"')) {
            cleanedValue = value.slice(1, -1).trim();
        }
        
        // Làm sạch HTML và ký tự đặc biệt
        cleanedValue = cleanedValue
            .replace(/<[^\>]+>/g, '') // Xóa thẻ HTML
            .replace(/{\\[a-zA-Z]+ (.*?)}/g, '$1') // Xóa LaTeX
            .replace(/\\[a-zA-Z]+{(.)}/g, '$1') // Xóa LaTeX kiểu \"o
            .replace(/\\[a-zA-Z]+(.)\b/g, '$1') // Xóa LaTeX kiểu \'e
            .replace(/â€“/g, '–')
            .replace(/â€/g, '"')
            .replace(/â€™/g, "'")
            .replace(/[ÃÄ][a-zA-Z]/g, match => {
                const map = { 'Ã©': 'é', 'Ãè': 'è', 'Ãê': 'ê', 'Ãë': 'ë', 'Ãñ': 'ñ', 'Ãü': 'ü', 'Ãö': 'ö', 'Ãâ': 'â' };
                return map[match] || match;
            });
        
        result[key.toLowerCase()] = cleanedValue;
    }
    
    return result;
}

function cleanDOI(doi) {
    // Xóa các tiền tố và chuẩn hóa DOI
    return doi.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, '').trim();
}

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function bibTeXToXML(data) {
    if (!data) return '';
    
    // Chuẩn hóa type
    const typeMap = {
        'book': 'Book',
        'inbook': 'BookSection',
        'article': 'JournalArticle',
        'inproceedings': 'ConferenceProceedings',
        'techreport': 'Report',
        'misc': 'Misc',
        'website': 'InternetSite',
        'periodical': 'ArticleInAPeriodical',
        'phdthesis': 'Report'
    };
    const sourceType = typeMap[data.type] || 'Misc';
    
    // Xử lý author
    let lastName = data.author || '';
    if (lastName.includes(' and ')) {
        lastName = lastName.split(' and ')[0].trim();
    }
    
    // Xử lý editor
    let editorName = data.editor || '';
    if (editorName.includes(' and ')) {
        editorName = editorName.split(' and ')[0].trim();
    }
    
    // Hàm hỗ trợ để thêm thẻ XML chỉ khi giá trị tồn tại và không rỗng
    const addTagIfValue = (tagName, value) => {
        if (value !== undefined && value !== null && value !== '') {
            return `<${tagName}>${value}</${tagName}>`;
        }
        return '';
    };
    
    // Hàm tạo XML cho từng loại
    const xmlTemplates = {
        Book: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Book</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:NumberVolumes', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        BookSection: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>BookSection</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:BookTitle', data.booktitle) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:NumberVolumes', data.number) +
                addTagIfValue('b:ChapterNumber', data.chapter) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                addTagIfValue('b:BookAuthor', data.bookauthor, `<b:BookAuthor><b:NameList><b:Person><b:Last>${data.bookauthor}</b:Last></b:Person></b:NameList></b:BookAuthor>`) +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        JournalArticle: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>JournalArticle</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:JournalName', data.journal) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Issue', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        ArticleInAPeriodical: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>ArticleInAPeriodical</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:PeriodicalTitle', data.journal) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Issue', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        ConferenceProceedings: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>ConferenceProceedings</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:ConferenceName', data.booktitle) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        Report: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Report</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Department', data.department) +
                addTagIfValue('b:Institution', data.school || data.institution) +
                addTagIfValue('b:ThesisType', data.thesistype || 'PhD thesis') +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        InternetSite: () => {
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>InternetSite</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:InternetSiteTitle', data.journal || data.website) +
                addTagIfValue('b:ProductionCompany', data.publisher) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:Version', data.version) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:ProducerName', data.producer, `<b:ProducerName><b:NameList><b:Person><b:Last>${data.producer}</b:Last></b:Person></b:NameList></b:ProducerName>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        Misc: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Misc</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn || data.isbn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:DOI', data.doi) +
                addTagIfValue('b:PublicationTitle', data.journal || data.booktitle) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Issue', data.number) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                addTagIfValue('b:Compiler', data.compiler, `<b:Compiler><b:NameList><b:Person><b:Last>${data.compiler}</b:Last></b:Person></b:NameList></b:Compiler>`) +
                `</b:Author>` +
                `</b:Source>`;
        }
    };
    
    return xmlTemplates[sourceType] ? xmlTemplates[sourceType]() : xmlTemplates.Misc();
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    if (!data) {
        resultDiv.innerHTML = '<div class="error">Invalid BibTeX data</div>';
        document.getElementById('xmlOutput').innerHTML = '';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'table table-hover';
    
    const headerRow = document.createElement('thead');
    headerRow.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
    table.appendChild(headerRow);
    const bodyRow = document.createElement('tbody');
    
    for (let [key, value] of Object.entries(data)) {
        const row = document.createElement('tr');
        if (key === "url") {
            row.innerHTML = `<td>${key}</td><td><a href="${value}" target="_blank" style="text-decoration: none; color: inherit; padding:0px">${value}</a></td>`;
        } else {
            row.innerHTML = `<td>${key}</td><td>${value}</td>`;
        }
        bodyRow.appendChild(row);
    }
    table.appendChild(bodyRow);
    
    resultDiv.appendChild(table);
    
    // Hiển thị XML output
    const xmlDiv = document.getElementById('xmlOutput');
    xmlDiv.innerHTML = '';
    
    const xmlHeader = document.createElement('h3');
    xmlHeader.textContent = 'XML Output';
    xmlDiv.appendChild(xmlHeader);
    
    const xmlContent = document.createElement('pre');
    xmlContent.textContent = bibTeXToXML(data);
    xmlDiv.appendChild(xmlContent);
}

async function fetchBibTeX() {
    const doiInput = document.getElementById('doiInput').value;
    const cleanDoi = cleanDOI(doiInput);
    
    if (!cleanDoi) {
        document.getElementById('result').innerHTML = '<div class="error">Please enter a valid DOI</div>';
        document.getElementById('xmlOutput').innerHTML = '';
        return;
    }
    
    const url = `https://doi.org/${cleanDoi}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch BibTeX');
        }
        
        const bibtex = await response.text();
        console.log(bibtex);
        const data = parseBibTeX(bibtex);
        displayResult(data);
    } catch (error) {
        document.getElementById('result').innerHTML = `<div class="error">Error: ${error.message}</div>`;
        document.getElementById('xmlOutput').innerHTML = '';
    }
}
